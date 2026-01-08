#!/bin/bash

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting SMS Platform Servers...${NC}"
echo ""

# Check if servers are already running
if lsof -ti:5002 > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Backend is already running on port 5002${NC}"
    echo -e "${YELLOW}   Use ./restart.sh to restart, or ./stop.sh to stop first${NC}"
    exit 1
fi

if lsof -ti:5001 > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Frontend is already running on port 5001${NC}"
    echo -e "${YELLOW}   Use ./restart.sh to restart, or ./stop.sh to stop first${NC}"
    exit 1
fi

# Start Backend
echo -e "${GREEN}🚀 Starting Backend Server (port 5002)...${NC}"
cd "$PROJECT_ROOT/backend"
npm run start:dev > /tmp/backend.log 2>&1 &
BACKEND_PID=$!
echo -e "${GREEN}Backend started (PID: $BACKEND_PID)${NC}"
echo -e "${YELLOW}Logs: tail -f /tmp/backend.log${NC}"

# Wait a bit for backend to initialize
sleep 3

# Start Frontend
echo ""
echo -e "${GREEN}🚀 Starting Frontend Server (port 5001)...${NC}"
cd "$PROJECT_ROOT/frontend"
# Build first if .next doesn't exist
if [ ! -d ".next" ]; then
    echo -e "${YELLOW}Building frontend for production...${NC}"
    npm run build
fi
# Use production mode for better static file serving
npm run start > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!
echo -e "${GREEN}Frontend started (PID: $FRONTEND_PID)${NC}"
echo -e "${YELLOW}Logs: tail -f /tmp/frontend.log${NC}"

# Wait a moment
sleep 3

# Check if servers are running
echo ""
echo -e "${GREEN}✅ Checking server status...${NC}"
sleep 2

if curl -s http://localhost:5002/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend is running on http://localhost:5002${NC}"
else
    echo -e "${RED}✗ Backend failed to start. Check logs: tail -f /tmp/backend.log${NC}"
fi

if curl -s http://localhost:5001 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Frontend is running on http://localhost:5001${NC}"
else
    echo -e "${RED}✗ Frontend failed to start. Check logs: tail -f /tmp/frontend.log${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Servers started!${NC}"
echo ""
echo "Access your application:"
echo "  - Frontend: http://localhost:5001"
echo "  - Backend API: http://localhost:5002/api"
echo ""
echo "View logs:"
echo "  - Backend: tail -f /tmp/backend.log"
echo "  - Frontend: tail -f /tmp/frontend.log"
echo ""
echo "To stop servers: ./stop.sh"
echo "To restart servers: ./restart.sh"

