#!/bin/bash

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== SMS Platform Validation Report ===${NC}"
echo ""

# Track issues
ISSUES=0
WARNINGS=0

# 1. Backend API
echo -e "${BLUE}1. Backend API${NC}"
if curl -s http://localhost:5000/api/health > /dev/null 2>&1; then
    echo -e "   ${GREEN}✓ Running on http://localhost:5000/api${NC}"
    HEALTH=$(curl -s http://localhost:5000/api/health 2>/dev/null | grep -o '"status":"[^"]*"' || echo "")
    echo "   Status: $HEALTH"
else
    echo -e "   ${RED}✗ Not responding${NC}"
    ((ISSUES++))
fi
echo ""

# 2. Frontend
echo -e "${BLUE}2. Frontend${NC}"
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5001 2>/dev/null)
if [ "$FRONTEND_STATUS" = "200" ]; then
    echo -e "   ${GREEN}✓ Running on http://localhost:5001${NC}"
elif [ "$FRONTEND_STATUS" = "500" ]; then
    echo -e "   ${YELLOW}⚠ Running but returning 500 error${NC}"
    echo "   Check logs: tail -f /tmp/frontend.log"
    ((WARNINGS++))
else
    echo -e "   ${RED}✗ Not responding (HTTP $FRONTEND_STATUS)${NC}"
    ((ISSUES++))
fi
echo ""

# 3. Database
echo -e "${BLUE}3. Database Connection${NC}"
if PGPASSWORD=sms_password psql -h localhost -p 5433 -U sms_user -d sms_platform -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "   ${GREEN}✓ Connected to PostgreSQL${NC}"
    DB_VERSION=$(PGPASSWORD=sms_password psql -h localhost -p 5433 -U sms_user -d sms_platform -t -c "SELECT version();" 2>/dev/null | head -1 | xargs)
    echo "   Version: ${DB_VERSION:0:50}..."
    
    TABLE_COUNT=$(PGPASSWORD=sms_password psql -h localhost -p 5433 -U sms_user -d sms_platform -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | xargs)
    if [ "$TABLE_COUNT" = "0" ] || [ -z "$TABLE_COUNT" ]; then
        echo -e "   ${YELLOW}⚠ No tables found - migrations may be needed${NC}"
        ((WARNINGS++))
    else
        echo "   Tables: $TABLE_COUNT"
    fi
else
    echo -e "   ${RED}✗ Connection failed${NC}"
    ((ISSUES++))
fi
echo ""

# 4. Redis
echo -e "${BLUE}4. Redis${NC}"
if redis-cli -h localhost -p 6379 ping > /dev/null 2>&1; then
    echo -e "   ${GREEN}✓ Connected${NC}"
else
    echo -e "   ${YELLOW}⚠ Not accessible on default port${NC}"
    ((WARNINGS++))
fi
echo ""

# 5. RabbitMQ
echo -e "${BLUE}5. RabbitMQ${NC}"
if curl -s -u sms_user:sms_password http://localhost:15672/api/overview > /dev/null 2>&1; then
    echo -e "   ${GREEN}✓ Management API accessible${NC}"
elif curl -s -u sms_user:sms_password http://localhost:15673/api/overview > /dev/null 2>&1; then
    echo -e "   ${GREEN}✓ Management API accessible (port 15673)${NC}"
else
    echo -e "   ${YELLOW}⚠ Management API not accessible${NC}"
    ((WARNINGS++))
fi
echo ""

# 6. Process Status
echo -e "${BLUE}6. Process Status${NC}"
BACKEND_PID=$(lsof -ti:5000 2>/dev/null | head -1)
FRONTEND_PID=$(lsof -ti:5001 2>/dev/null | head -1)

if [ ! -z "$BACKEND_PID" ]; then
    echo -e "   ${GREEN}✓ Backend running (PID: $BACKEND_PID)${NC}"
else
    echo -e "   ${RED}✗ Backend not running${NC}"
    ((ISSUES++))
fi

if [ ! -z "$FRONTEND_PID" ]; then
    echo -e "   ${GREEN}✓ Frontend running (PID: $FRONTEND_PID)${NC}"
else
    echo -e "   ${RED}✗ Frontend not running${NC}"
    ((ISSUES++))
fi
echo ""

# 7. Configuration
echo -e "${BLUE}7. Configuration Files${NC}"
if [ -f "$PROJECT_ROOT/backend/.env" ]; then
    echo -e "   ${GREEN}✓ Backend .env exists${NC}"
    DB_PORT=$(grep DB_PORT "$PROJECT_ROOT/backend/.env" 2>/dev/null | cut -d'=' -f2 | xargs)
    echo "   Database port: $DB_PORT"
else
    echo -e "   ${RED}✗ Backend .env missing${NC}"
    ((ISSUES++))
fi

if [ -f "$PROJECT_ROOT/frontend/.env.local" ]; then
    echo -e "   ${GREEN}✓ Frontend .env.local exists${NC}"
else
    echo -e "   ${YELLOW}⚠ Frontend .env.local missing${NC}"
    ((WARNINGS++))
fi
echo ""

# Summary
echo -e "${BLUE}=== Summary ===${NC}"
if [ $ISSUES -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ All systems operational!${NC}"
    exit 0
elif [ $ISSUES -eq 0 ]; then
    echo -e "${YELLOW}⚠️  $WARNINGS warning(s) - system functional but needs attention${NC}"
    exit 0
else
    echo -e "${RED}❌ $ISSUES critical issue(s) found${NC}"
    if [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW}   $WARNINGS warning(s)${NC}"
    fi
    exit 1
fi

