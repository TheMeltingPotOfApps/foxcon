#!/bin/bash

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🛑 Stopping SMS Platform Servers...${NC}"
echo ""

# Function to kill process on a port
kill_port() {
    local port=$1
    local max_attempts=5
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        # Try multiple methods to find processes on the port
        local pids=$(lsof -ti:$port 2>/dev/null)
        if [ -z "$pids" ]; then
            # Also try fuser
            pids=$(fuser $port/tcp 2>/dev/null | awk '{print $NF}' | tr -d ':')
        fi
        
        if [ ! -z "$pids" ]; then
            echo -e "${YELLOW}Stopping process(es) on port $port (PIDs: $pids)${NC}"
            echo "$pids" | xargs kill -9 2>/dev/null || true
            fuser -k $port/tcp 2>/dev/null || true
            sleep 1
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

# Kill Backend
echo -e "${YELLOW}Stopping Backend (port 5002)...${NC}"
kill_port 5002

# Kill Frontend
echo -e "${YELLOW}Stopping Frontend (port 5001)...${NC}"
kill_port 5001

# Kill TTS Service
echo -e "${YELLOW}Stopping TTS Service (port 8000)...${NC}"
if [ -f "$PROJECT_ROOT/kokoro/start-kokoro.sh" ]; then
    "$PROJECT_ROOT/kokoro/start-kokoro.sh" stop 2>/dev/null || true
fi
kill_port 8000
pkill -f "api_server.py" 2>/dev/null

# Also kill any node processes related to the project
echo ""
echo -e "${YELLOW}Cleaning up any remaining processes...${NC}"
# Kill by process name patterns (more reliable than port-based)
pkill -9 -f "nest start" 2>/dev/null || true
pkill -9 -f "next dev" 2>/dev/null || true
pkill -9 -f "next start" 2>/dev/null || true
pkill -9 -f "next-server" 2>/dev/null || true
# Also kill any node processes in the project directories (using path-agnostic pattern)
# Note: This uses a pattern that matches the project structure without hardcoding paths
pkill -9 -f "backend.*nest\|backend.*node" 2>/dev/null || true
pkill -9 -f "frontend.*next\|frontend.*node" 2>/dev/null || true

# Clean up PM2 instances
pm2 stop kokoro-tts 2>/dev/null || true
pm2 delete kokoro-tts 2>/dev/null || true

sleep 1

echo ""
echo -e "${GREEN}✅ All servers stopped${NC}"

