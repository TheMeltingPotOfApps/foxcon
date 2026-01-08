#!/bin/bash

# Migration script to move from IP-based access to custom domains
# This script ensures everything is configured correctly

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 NurtureEngine Domain Migration Script${NC}"
echo "=========================================="
echo ""

# Check if running as root (for some operations)
if [ "$EUID" -ne 0 ]; then 
    echo -e "${YELLOW}Some operations require root. You may need to run parts with sudo.${NC}"
fi

# Step 1: Verify DNS
echo -e "${YELLOW}Step 1: Verifying DNS configuration...${NC}"
SERVER_IP=$(hostname -I | awk '{print $1}')
APP_IP=$(dig +short app.nurtureengine.net 2>/dev/null | tail -n1 || echo "not resolved")
API_IP=$(dig +short api.nurtureengine.net 2>/dev/null | tail -n1 || echo "not resolved")

echo "Server IP: $SERVER_IP"
echo "app.nurtureengine.net → $APP_IP"
echo "api.nurtureengine.net → $API_IP"

if [ "$APP_IP" = "$SERVER_IP" ] && [ "$API_IP" = "$SERVER_IP" ]; then
    echo -e "${GREEN}✅ DNS is configured correctly${NC}"
else
    echo -e "${RED}❌ DNS is not pointing to this server${NC}"
    echo "Please configure DNS records:"
    echo "  app.nurtureengine.net → $SERVER_IP"
    echo "  api.nurtureengine.net → $SERVER_IP"
    exit 1
fi

# Step 2: Check Nginx
echo ""
echo -e "${YELLOW}Step 2: Checking Nginx...${NC}"
if command -v nginx &> /dev/null; then
    if systemctl is-active --quiet nginx; then
        echo -e "${GREEN}✅ Nginx is installed and running${NC}"
    else
        echo -e "${YELLOW}⚠️  Nginx is installed but not running${NC}"
        echo "Starting Nginx..."
        sudo systemctl start nginx
    fi
else
    echo -e "${RED}❌ Nginx is not installed${NC}"
    echo "Run: sudo ./scripts/setup-nginx.sh"
    exit 1
fi

# Step 3: Check SSL certificates
echo ""
echo -e "${YELLOW}Step 3: Checking SSL certificates...${NC}"
if [ -f "/etc/letsencrypt/live/nurtureengine.net/fullchain.pem" ]; then
    echo -e "${GREEN}✅ SSL certificates are installed${NC}"
    
    # Check certificate expiration
    EXPIRY=$(openssl x509 -enddate -noout -in /etc/letsencrypt/live/nurtureengine.net/fullchain.pem | cut -d= -f2)
    echo "Certificate expires: $EXPIRY"
else
    echo -e "${RED}❌ SSL certificates are not installed${NC}"
    echo "Run: sudo ./scripts/setup-ssl.sh"
    exit 1
fi

# Step 4: Verify services are running
echo ""
echo -e "${YELLOW}Step 4: Verifying services are running...${NC}"

# Check frontend (port 5001)
if curl -s http://localhost:5001 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend is running on port 5001${NC}"
else
    echo -e "${RED}❌ Frontend is not running on port 5001${NC}"
    echo "Please start the frontend service"
fi

# Check backend (port 5000)
if curl -s http://localhost:5000/api/health > /dev/null 2>&1 || curl -s http://localhost:5000/api > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend is running on port 5000${NC}"
else
    echo -e "${RED}❌ Backend is not running on port 5000${NC}"
    echo "Please start the backend service"
fi

# Step 5: Test HTTPS endpoints
echo ""
echo -e "${YELLOW}Step 5: Testing HTTPS endpoints...${NC}"

# Test frontend
if curl -s -k https://app.nurtureengine.net > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend is accessible via HTTPS${NC}"
else
    echo -e "${RED}❌ Frontend is not accessible via HTTPS${NC}"
fi

# Test backend
if curl -s -k https://api.nurtureengine.net/api > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend is accessible via HTTPS${NC}"
else
    echo -e "${RED}❌ Backend is not accessible via HTTPS${NC}"
fi

# Step 6: Final verification
echo ""
echo -e "${YELLOW}Step 6: Final verification...${NC}"
echo ""
echo -e "${BLUE}Testing endpoints:${NC}"
echo ""

# Test frontend
echo -n "Frontend (app.nurtureengine.net): "
if curl -s -o /dev/null -w "%{http_code}" https://app.nurtureengine.net | grep -q "200\|301\|302"; then
    echo -e "${GREEN}✅ OK${NC}"
else
    echo -e "${RED}❌ FAILED${NC}"
fi

# Test backend
echo -n "Backend API (api.nurtureengine.net/api): "
if curl -s -o /dev/null -w "%{http_code}" https://api.nurtureengine.net/api | grep -q "200\|401\|404"; then
    echo -e "${GREEN}✅ OK${NC}"
else
    echo -e "${RED}❌ FAILED${NC}"
fi

echo ""
echo -e "${GREEN}==========================================${NC}"
echo -e "${GREEN}Migration Summary${NC}"
echo -e "${GREEN}==========================================${NC}"
echo ""
echo -e "${GREEN}✅ Your application is now available at:${NC}"
echo "   Frontend: https://app.nurtureengine.net"
echo "   Backend:  https://api.nurtureengine.net/api"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Update any external integrations to use the new domains"
echo "2. Test all functionality through the new domains"
echo "3. Monitor logs for any issues:"
echo "   - Nginx: tail -f /var/log/nginx/*.log"
echo "   - Frontend: Check your frontend logs"
echo "   - Backend: Check your backend logs"
echo ""
echo -e "${GREEN}Migration complete! 🎉${NC}"

