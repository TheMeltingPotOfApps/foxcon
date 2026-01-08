#!/bin/bash

# Setup script for Nginx reverse proxy with SSL
# This script installs Nginx, sets up SSL certificates, and configures the reverse proxy

set -e

echo "🚀 Setting up Nginx reverse proxy for NurtureEngine..."

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

# Update package list
echo -e "${YELLOW}Updating package list...${NC}"
apt-get update

# Install Nginx
echo -e "${YELLOW}Installing Nginx...${NC}"
apt-get install -y nginx

# Install Certbot for SSL certificates
echo -e "${YELLOW}Installing Certbot...${NC}"
apt-get install -y certbot python3-certbot-nginx

# Create certbot webroot directory
echo -e "${YELLOW}Creating certbot webroot directory...${NC}"
mkdir -p /var/www/certbot

# Copy Nginx configuration (HTTP-only first, will be upgraded to HTTPS after SSL)
echo -e "${YELLOW}Copying Nginx configuration...${NC}"
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cp "$SCRIPT_DIR/../nginx/nurtureengine-http-only.conf" /etc/nginx/sites-available/nurtureengine.conf

# Enable the site
echo -e "${YELLOW}Enabling Nginx site...${NC}"
ln -sf /etc/nginx/sites-available/nurtureengine.conf /etc/nginx/sites-enabled/

# Remove default Nginx site if it exists
if [ -f /etc/nginx/sites-enabled/default ]; then
    echo -e "${YELLOW}Removing default Nginx site...${NC}"
    rm /etc/nginx/sites-enabled/default
fi

# Test Nginx configuration
echo -e "${YELLOW}Testing Nginx configuration...${NC}"
nginx -t

# Start and enable Nginx
echo -e "${YELLOW}Starting Nginx...${NC}"
systemctl start nginx
systemctl enable nginx

echo -e "${GREEN}✅ Nginx installed and configured!${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Ensure DNS records point to this server:"
echo "   - app.nurtureengine.net → $(hostname -I | awk '{print $1}')"
echo "   - api.nurtureengine.net → $(hostname -I | awk '{print $1}')"
echo ""
echo "2. Run the SSL certificate setup script:"
echo "   sudo ./scripts/setup-ssl.sh"
echo ""
echo "3. Ensure your frontend and backend are running:"
echo "   - Frontend: port 5001"
echo "   - Backend: port 5000"

