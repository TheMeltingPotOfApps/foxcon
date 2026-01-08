#!/bin/bash

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔍 Validating Latest Build Status...${NC}"
echo ""

# Check Backend Build
echo -e "${YELLOW}Checking Backend Build...${NC}"
cd "$PROJECT_ROOT/backend"
if [ -f "dist/src/entities/calendar-event.entity.js" ]; then
    BACKEND_BUILD_TIME=$(stat -c "%y" dist/src/entities/calendar-event.entity.js)
    echo -e "${GREEN}✓ Backend built at: ${BACKEND_BUILD_TIME}${NC}"
elif [ -d "dist" ] && [ "$(ls -A dist 2>/dev/null)" ]; then
    BACKEND_BUILD_TIME=$(stat -c "%y" dist | head -1)
    echo -e "${GREEN}✓ Backend dist folder exists at: ${BACKEND_BUILD_TIME}${NC}"
elif pgrep -f "nest start" > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠ Backend running in dev mode (no dist folder needed)${NC}"
else
    echo -e "${RED}✗ Backend not built and not running${NC}"
fi

# Check Frontend Build
echo -e "${YELLOW}Checking Frontend Build...${NC}"
cd "$PROJECT_ROOT/frontend"
if [ -d ".next" ]; then
    FRONTEND_BUILD_TIME=$(stat -c "%y" .next | head -1)
    echo -e "${GREEN}✓ Frontend built at: ${FRONTEND_BUILD_TIME}${NC}"
else
    echo -e "${RED}✗ Frontend not built${NC}"
fi

# Check if servers are running
echo ""
echo -e "${YELLOW}Checking Server Status...${NC}"
if lsof -ti:5000 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend is running on port 5000${NC}"
else
    echo -e "${RED}✗ Backend is not running${NC}"
fi

# Check frontend with multiple methods
FRONTEND_RUNNING=false
if lsof -ti:5001 > /dev/null 2>&1; then
    FRONTEND_RUNNING=true
elif timeout 1 bash -c "exec 3<>/dev/tcp/localhost/5001" 2>/dev/null; then
    FRONTEND_RUNNING=true
fi

if [ "$FRONTEND_RUNNING" = true ]; then
    echo -e "${GREEN}✓ Frontend is running on port 5001${NC}"
else
    echo -e "${RED}✗ Frontend is not running${NC}"
    # Check if there's a process trying to start
    if pgrep -f "next start" > /dev/null 2>&1; then
        echo -e "${YELLOW}  (Frontend process detected but may still be starting)${NC}"
    fi
fi

# Check database connection
echo ""
echo -e "${YELLOW}Checking Database Connection...${NC}"
cd "$PROJECT_ROOT/backend"
source .env 2>/dev/null || true
if PGPASSWORD="${DB_PASSWORD:-sms_password}" psql -h "${DB_HOST:-localhost}" -p "${DB_PORT:-5433}" -U "${DB_USERNAME:-sms_user}" -d "${DB_DATABASE:-sms_platform}" -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Database connection successful${NC}"
    
    # Check for calendar_events table
    if PGPASSWORD="${DB_PASSWORD:-sms_password}" psql -h "${DB_HOST:-localhost}" -p "${DB_PORT:-5433}" -U "${DB_USERNAME:-sms_user}" -d "${DB_DATABASE:-sms_platform}" -c "\d calendar_events" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ calendar_events table exists${NC}"
    else
        echo -e "${RED}✗ calendar_events table does not exist${NC}"
    fi
else
    echo -e "${RED}✗ Database connection failed${NC}"
fi

echo ""
echo -e "${GREEN}✅ Validation Complete${NC}"
echo ""
echo "To ensure latest code is running, execute: ./restart.sh"

