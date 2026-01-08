#!/bin/bash

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔄 Restarting SMS Platform Servers...${NC}"
echo -e "${YELLOW}  (Backend, Frontend, TTS Service, and Nurture Leads)${NC}"
echo ""

# Function to kill process on a port
kill_port() {
    local port=$1
    local max_attempts=5
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        # Try multiple methods to kill processes on the port
        local pids=$(lsof -ti:$port 2>/dev/null)
        if [ -z "$pids" ]; then
            # Also try fuser
            pids=$(fuser $port/tcp 2>/dev/null | awk '{print $NF}' | tr -d ':')
        fi
        
        if [ ! -z "$pids" ]; then
            echo -e "${YELLOW}Stopping process(es) on port $port (PIDs: $pids)${NC}"
            echo "$pids" | xargs kill -9 2>/dev/null
            fuser -k $port/tcp 2>/dev/null
            sleep 2
            attempt=$((attempt + 1))
        else
            # Port is free
            break
        fi
    done
    
    # Final verification
    if lsof -ti:$port > /dev/null 2>&1 || fuser $port/tcp > /dev/null 2>&1; then
        echo -e "${YELLOW}Warning: Port $port may still be in use after cleanup${NC}"
    fi
}

# Kill existing processes
echo -e "${YELLOW}Stopping existing servers...${NC}"
kill_port 5002  # Backend
kill_port 5001  # Frontend
kill_port 8000  # TTS Service

# Wait for ports to be fully released
sleep 3
# Double-check ports are free (especially important for frontend)
kill_port 5002
kill_port 5001
kill_port 8000
sleep 3

# Start Backend (includes Marketplace module)
echo ""
echo -e "${GREEN}🚀 Starting Backend Server (port 5002)...${NC}"
echo -e "${YELLOW}  (Includes Lead Marketplace module)${NC}"
cd "$PROJECT_ROOT/backend"
# Kill any existing backend processes
pkill -f "nest start" || true
sleep 1
# Ensure dependencies are installed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing backend dependencies...${NC}"
    npm install || {
        # If install fails, check if it's just a husky error (non-critical)
        if [ -d "node_modules" ]; then
            echo -e "${YELLOW}⚠ npm install had warnings but dependencies were installed${NC}"
        else
            echo -e "${RED}✗ Failed to install backend dependencies${NC}"
            exit 1
        fi
    }
fi
# Clear any old build artifacts first
echo -e "${YELLOW}Clearing old build artifacts...${NC}"
rm -rf dist 2>/dev/null || true
# Build backend to ensure latest code is compiled
echo -e "${YELLOW}Building backend with latest code...${NC}"
npm run build
npm run start:dev > /tmp/backend.log 2>&1 &
BACKEND_PID=$!
echo -e "${GREEN}Backend started (PID: $BACKEND_PID)${NC}"
echo -e "${GREEN}✓ Nurture Leads module will start with backend${NC}"
echo -e "${YELLOW}Logs: tail -f /tmp/backend.log${NC}"

# Wait a bit for backend to initialize
sleep 3

# Start TTS Service (robust startup without PM2)
echo ""
echo -e "${GREEN}🚀 Starting TTS Service (port 8000)...${NC}"
cd "$PROJECT_ROOT/kokoro"

# Stop any existing PM2 instances (with timeout to prevent hanging)
# Use timeout to prevent script from hanging if PM2 is stuck
# Check if PM2 is running and if the process exists before trying to stop it
if command -v pm2 >/dev/null 2>&1; then
    # Check if kokoro-tts process exists in PM2
    if timeout 2 pm2 list 2>/dev/null | grep -q "kokoro-tts"; then
        echo -e "${YELLOW}Stopping existing PM2 kokoro-tts process...${NC}"
        timeout 5 pm2 stop kokoro-tts 2>/dev/null || true
        timeout 5 pm2 delete kokoro-tts 2>/dev/null || true
    fi
fi

# Kill any existing TTS processes and free port (do this regardless of PM2 status)
pkill -9 -f "api_server.py" 2>/dev/null || true
pkill -f "uvicorn.*8000" 2>/dev/null || true
lsof -ti :8000 | xargs kill -9 2>/dev/null || true
sleep 2

# Ensure log directory exists
mkdir -p "$PROJECT_ROOT/kokoro/logs"

# Start TTS service directly with nohup (robust, survives terminal closure)
TTS_PID=""
TTS_USE_PM2=false

echo -e "${YELLOW}Starting TTS service (this may take 10-30 seconds for model loading)...${NC}"
nohup python3 api_server.py >> "$PROJECT_ROOT/kokoro/logs/kokoro-tts.log" 2>> "$PROJECT_ROOT/kokoro/logs/kokoro-tts-error.log" < /dev/null &
TTS_PID=$!

# Save PID for tracking
echo $TTS_PID > "$PROJECT_ROOT/kokoro/kokoro-tts.pid"

# Wait a moment for process to start
sleep 3

# Verify process is running
if ps -p "$TTS_PID" > /dev/null 2>&1; then
    echo -e "${GREEN}TTS Service started (PID: $TTS_PID)${NC}"
    echo -e "${YELLOW}Waiting for service to bind to port (model loading may take time)...${NC}"
    echo -e "${YELLOW}Logs: tail -f $PROJECT_ROOT/kokoro/logs/kokoro-tts.log${NC}"
    echo -e "${YELLOW}Errors: tail -f $PROJECT_ROOT/kokoro/logs/kokoro-tts-error.log${NC}"
else
    echo -e "${RED}✗ TTS Service failed to start${NC}"
    echo -e "${RED}Check error log: tail -f $PROJECT_ROOT/kokoro/logs/kokoro-tts-error.log${NC}"
    rm -f "$PROJECT_ROOT/kokoro/kokoro-tts.pid"
fi

# Start Frontend
echo ""
echo -e "${GREEN}🚀 Starting Frontend Server (port 5001)...${NC}"
cd "$PROJECT_ROOT/frontend"
# Kill any existing frontend processes
pkill -f "next start" || true
pkill -f "next-server" || true
sleep 1
# Ensure dependencies are installed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing frontend dependencies...${NC}"
    npm install || {
        # If install fails, check if it's just a husky error (non-critical)
        if [ -d "node_modules" ]; then
            echo -e "${YELLOW}⚠ npm install had warnings but dependencies were installed${NC}"
        else
            echo -e "${RED}✗ Failed to install frontend dependencies${NC}"
            exit 1
        fi
    }
fi
# Clear old build artifacts first
echo -e "${YELLOW}Clearing old build artifacts...${NC}"
rm -rf .next 2>/dev/null || true
# Always rebuild to ensure latest code is served
echo -e "${YELLOW}Building frontend with latest code...${NC}"
npm run build
# Use production mode for better static file serving and correct MIME types
npm run start > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!
echo -e "${GREEN}Frontend started (PID: $FRONTEND_PID)${NC}"
echo -e "${YELLOW}Logs: tail -f /tmp/frontend.log${NC}"

# Wait a moment for servers to start
sleep 5

# Check if servers are running
echo ""
echo -e "${GREEN}✅ Checking server status...${NC}"
sleep 8  # Give servers time to fully start and bind to ports

# Check backend by verifying port is listening and process is running
if lsof -ti:5002 > /dev/null 2>&1; then
    # Check for various startup messages (including emoji variations)
    if tail -50 /tmp/backend.log 2>/dev/null | grep -qiE "Backend API running|🚀.*Backend|successfully started|running on|Nest application|Application is running|listening on"; then
        echo -e "${GREEN}✓ Backend is running on http://localhost:5002${NC}"
        # Check if Nurture Leads module started successfully
        if tail -50 /tmp/backend.log 2>/dev/null | grep -qiE "LeadMarketplaceModule|nurture-leads|RabbitMQ.*consumer.*started"; then
            echo -e "${GREEN}✓ Nurture Leads module is active${NC}"
        fi
        # Check for database errors in recent logs (exclude authentication errors)
        if tail -50 /tmp/backend.log 2>/dev/null | grep -qiE "(42P01|relation.*does not exist|table.*does not exist|connection.*failed|database.*error|ECONNREFUSED.*543)" | grep -vqiE "(Unauthorized|401|authentication|JWT|token|AllExceptionsFilter)"; then
            echo -e "${YELLOW}⚠ Backend is running but database errors detected. Check: tail -f /tmp/backend.log${NC}"
        fi
    else
        # Port is listening but no startup message - might still be starting or have errors
        # Check for database errors (exclude authentication errors)
        if tail -50 /tmp/backend.log 2>/dev/null | grep -qiE "(42P01|relation.*does not exist|table.*does not exist|connection.*failed|database.*error|ECONNREFUSED.*543)" | grep -vqiE "(Unauthorized|401|authentication|JWT|token|AllExceptionsFilter)"; then
            echo -e "${RED}✗ Backend port is listening but database errors detected. Check logs: tail -f /tmp/backend.log${NC}"
        elif tail -50 /tmp/backend.log 2>/dev/null | grep -qiE "query:|SELECT|FROM"; then
            # If we see queries, backend is likely running even without explicit startup message
            echo -e "${GREEN}✓ Backend is running on http://localhost:5002 (detected via query logs)${NC}"
        else
            echo -e "${YELLOW}⚠ Backend port is listening but startup message not found. May still be starting. Check: tail -f /tmp/backend.log${NC}"
        fi
    fi
else
    echo -e "${RED}✗ Backend failed to start. Check logs: tail -f /tmp/backend.log${NC}"
fi

# Check frontend by verifying port is listening and process is running
# Use multiple methods to check if frontend is actually working
FRONTEND_RUNNING=false

# Method 1: Check if process is still running
if kill -0 $FRONTEND_PID 2>/dev/null; then
    # Method 2: Check if port is accepting connections (more reliable than lsof)
    if timeout 1 bash -c "exec 3<>/dev/tcp/localhost/5001" 2>/dev/null; then
        FRONTEND_RUNNING=true
    fi
fi

# Method 3: Check lsof as fallback
if [ "$FRONTEND_RUNNING" = false ] && lsof -ti:5001 > /dev/null 2>&1; then
    FRONTEND_RUNNING=true
fi

# Method 4: Check logs for "Ready" message
if [ "$FRONTEND_RUNNING" = false ] && tail -n 20 /tmp/frontend.log 2>/dev/null | grep -qi "Ready"; then
    # Give it a moment and check connection again
    sleep 2
    if timeout 1 bash -c "exec 3<>/dev/tcp/localhost/5001" 2>/dev/null; then
        FRONTEND_RUNNING=true
    fi
fi

if [ "$FRONTEND_RUNNING" = true ]; then
    echo -e "${GREEN}✓ Frontend is running on http://localhost:5001${NC}"
else
    # Check log for actual errors
    if tail -n 50 /tmp/frontend.log 2>/dev/null | grep -qiE "error.*listen|EADDRINUSE"; then
        echo -e "${RED}✗ Frontend failed to start (port conflict). Check logs: tail -f /tmp/frontend.log${NC}"
    else
        echo -e "${YELLOW}⚠ Frontend may be starting. Check logs: tail -f /tmp/frontend.log${NC}"
    fi
fi

# Check TTS Service by verifying port is listening and API is responding
echo ""
TTS_RUNNING=false

# Method 1: Use the startup script status check if available
if [ -f "$PROJECT_ROOT/kokoro/start-kokoro.sh" ]; then
    if "$PROJECT_ROOT/kokoro/start-kokoro.sh" status > /dev/null 2>&1; then
        TTS_RUNNING=true
    fi
fi

# Method 2: Check if port is listening
if [ "$TTS_RUNNING" = false ] && lsof -ti:8000 > /dev/null 2>&1; then
    # Try to connect to the API endpoint
    if timeout 2 bash -c "exec 3<>/dev/tcp/localhost/8000" 2>/dev/null; then
        TTS_RUNNING=true
    else
        # Port is listening but connection failed - might still be starting
        sleep 2
        if timeout 2 bash -c "exec 3<>/dev/tcp/localhost/8000" 2>/dev/null; then
            TTS_RUNNING=true
        fi
    fi
fi

# Method 3: Check logs for startup message
if [ "$TTS_RUNNING" = false ]; then
    if tail -n 30 "$PROJECT_ROOT/kokoro/logs/kokoro-tts.log" 2>/dev/null | grep -qiE "Starting Kokoro|API will be available|Application startup complete|Uvicorn running"; then
        sleep 2
        if timeout 2 bash -c "exec 3<>/dev/tcp/localhost/8000" 2>/dev/null; then
            TTS_RUNNING=true
        fi
    fi
fi

if [ "$TTS_RUNNING" = true ]; then
    echo -e "${GREEN}✓ TTS Service is running on http://localhost:8000${NC}"
    if [ -f "$PROJECT_ROOT/kokoro/kokoro-tts.pid" ]; then
        echo -e "${GREEN}  PID: $(cat $PROJECT_ROOT/kokoro/kokoro-tts.pid)${NC}"
    fi
else
    # Check log for errors
    if tail -n 50 "$PROJECT_ROOT/kokoro/logs/kokoro-tts-error.log" 2>/dev/null | grep -qiE "error|Error|ERROR|failed|Failed|FAILED|exception|Exception"; then
        echo -e "${RED}✗ TTS Service failed to start. Check logs: tail -f $PROJECT_ROOT/kokoro/logs/kokoro-tts-error.log${NC}"
    elif [ -f "$PROJECT_ROOT/kokoro/kokoro-tts.pid" ]; then
        pid=$(cat "$PROJECT_ROOT/kokoro/kokoro-tts.pid")
        if ps -p "$pid" > /dev/null 2>&1; then
            echo -e "${YELLOW}⚠ TTS Service process is running but port not bound yet. May still be loading model.${NC}"
            echo -e "${YELLOW}  Check logs: tail -f $PROJECT_ROOT/kokoro/logs/kokoro-tts.log${NC}"
        else
            echo -e "${RED}✗ TTS Service process died. Check logs: tail -f $PROJECT_ROOT/kokoro/logs/kokoro-tts-error.log${NC}"
        fi
    else
        echo -e "${YELLOW}⚠ TTS Service may be starting. Check logs: tail -f $PROJECT_ROOT/kokoro/logs/kokoro-tts.log${NC}"
    fi
fi

echo ""
echo -e "${GREEN}🎉 Restart complete!${NC}"
echo ""
echo "Access your application:"
echo "  - Frontend: http://localhost:5001"
echo "  - Backend API: http://localhost:5002/api"
echo "  - Nurture Leads: http://localhost:5001/nurture-leads"
echo "  - TTS Service: http://localhost:8000"
echo ""
echo "View logs:"
echo "  - Backend: tail -f /tmp/backend.log"
echo "  - Frontend: tail -f /tmp/frontend.log"
echo "  - TTS Service: tail -f $PROJECT_ROOT/kokoro/logs/kokoro-tts.log"
echo "  - TTS Errors: tail -f $PROJECT_ROOT/kokoro/logs/kokoro-tts-error.log"
echo ""
echo "Manage TTS Service:"
echo "  - Status: $PROJECT_ROOT/kokoro/start-kokoro.sh status"
echo "  - Stop: $PROJECT_ROOT/kokoro/start-kokoro.sh stop"
echo "  - Restart: $PROJECT_ROOT/kokoro/start-kokoro.sh restart"
echo ""
echo "To stop servers:"
if [ ! -z "$TTS_PID" ]; then
    echo "  - kill $BACKEND_PID $FRONTEND_PID $TTS_PID"
else
    echo "  - kill $BACKEND_PID $FRONTEND_PID"
fi
echo "  - Or use: ./stop.sh"

