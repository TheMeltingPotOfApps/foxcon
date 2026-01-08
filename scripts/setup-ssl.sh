#!/bin/bash

# SSL Certificate Setup Script for NurtureEngine
# This script obtains SSL certificates from Let's Encrypt

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run as root (use sudo)${NC}"
    exit 1
fi

echo "🔒 Setting up SSL certificates for NurtureEngine..."

# Check if Nginx is installed
if ! command -v nginx &> /dev/null; then
    echo -e "${RED}Nginx is not installed. Please run setup-nginx.sh first.${NC}"
    exit 1
fi

# Check if Certbot is installed
if ! command -v certbot &> /dev/null; then
    echo -e "${YELLOW}Installing Certbot...${NC}"
    apt-get update
    apt-get install -y certbot python3-certbot-nginx
fi

# Use default email or environment variable
EMAIL="${LETSENCRYPT_EMAIL:-admin@nurtureengine.net}"
echo -e "${YELLOW}Using email: $EMAIL${NC}"

# Verify DNS is pointing to this server
echo -e "${YELLOW}Verifying DNS configuration...${NC}"
SERVER_IP=$(hostname -I | awk '{print $1}')
APP_IP=$(dig +short app.nurtureengine.net | tail -n1)
API_IP=$(dig +short api.nurtureengine.net | tail -n1)

echo "Server IP: $SERVER_IP"
echo "app.nurtureengine.net resolves to: $APP_IP"
echo "api.nurtureengine.net resolves to: $API_IP"

if [ "$APP_IP" != "$SERVER_IP" ] || [ "$API_IP" != "$SERVER_IP" ]; then
    echo -e "${RED}⚠️  WARNING: DNS records may not be pointing to this server!${NC}"
    echo -e "${YELLOW}Please ensure DNS records are configured correctly before proceeding.${NC}"
    read -p "Continue anyway? (y/N): " CONTINUE
    if [ "$CONTINUE" != "y" ] && [ "$CONTINUE" != "Y" ]; then
        exit 1
    fi
fi

# Obtain SSL certificates
echo -e "${YELLOW}Obtaining SSL certificates from Let's Encrypt...${NC}"
certbot certonly \
    --nginx \
    --non-interactive \
    --agree-tos \
    --email "$EMAIL" \
    --domains app.nurtureengine.net,api.nurtureengine.net \
    --cert-name nurtureengine.net

# Reload Nginx to apply SSL configuration
echo -e "${YELLOW}Reloading Nginx...${NC}"
systemctl reload nginx

# Set up auto-renewal
echo -e "${YELLOW}Setting up certificate auto-renewal...${NC}"
systemctl enable certbot.timer
systemctl start certbot.timer

# Test renewal
echo -e "${YELLOW}Testing certificate renewal...${NC}"
certbot renew --dry-run

echo ""
echo -e "${GREEN}✅ SSL certificates installed successfully!${NC}"
echo ""
echo -e "${GREEN}Your sites are now available at:${NC}"
echo "  - https://app.nurtureengine.net"
echo "  - https://api.nurtureengine.net"
echo ""
echo -e "${YELLOW}Certificates will auto-renew. You can test renewal with:${NC}"
echo "  sudo certbot renew --dry-run"

