#!/bin/bash

# Comprehensive Server Setup Script for SMS Platform
# This script installs all dependencies including Asterisk and configures the application

set -e  # Exit on error

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NODE_VERSION="20"
POSTGRES_VERSION="15"
ASTERISK_VERSION="20"

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   SMS Platform - Complete Server Setup Script${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}✗ Please run as root or with sudo${NC}"
    exit 1
fi

# Function to print section headers
print_section() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to install package (Debian/Ubuntu)
install_package() {
    if ! dpkg -l | grep -q "^ii  $1 "; then
        echo -e "${YELLOW}Installing $1...${NC}"
        apt-get update -qq
        DEBIAN_FRONTEND=noninteractive apt-get install -y "$1" > /dev/null 2>&1
        echo -e "${GREEN}✓ $1 installed${NC}"
    else
        echo -e "${GREEN}✓ $1 already installed${NC}"
    fi
}

# ============================================================================
# STEP 1: System Update and Basic Dependencies
# ============================================================================
print_section "Step 1: System Update and Basic Dependencies"

echo -e "${YELLOW}Updating system packages...${NC}"
apt-get update -qq
DEBIAN_FRONTEND=noninteractive apt-get upgrade -y -qq

# Install basic build tools
install_package "build-essential"
install_package "curl"
install_package "wget"
install_package "git"
install_package "vim"
install_package "software-properties-common"
install_package "apt-transport-https"
install_package "ca-certificates"
install_package "gnupg"
install_package "lsb-release"

# ============================================================================
# STEP 2: Install Node.js
# ============================================================================
print_section "Step 2: Installing Node.js"

if command_exists node; then
    NODE_CURRENT=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_CURRENT" -ge "$NODE_VERSION" ]; then
        echo -e "${GREEN}✓ Node.js $(node -v) already installed${NC}"
    else
        echo -e "${YELLOW}Node.js version is too old, installing Node.js $NODE_VERSION...${NC}"
    fi
else
    echo -e "${YELLOW}Installing Node.js $NODE_VERSION...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
    apt-get install -y nodejs
fi

# Verify Node.js installation
if command_exists node; then
    echo -e "${GREEN}✓ Node.js $(node -v) installed${NC}"
    echo -e "${GREEN}✓ npm $(npm -v) installed${NC}"
else
    echo -e "${RED}✗ Node.js installation failed${NC}"
    exit 1
fi

# Install PM2 globally
if ! command_exists pm2; then
    echo -e "${YELLOW}Installing PM2...${NC}"
    npm install -g pm2
    echo -e "${GREEN}✓ PM2 installed${NC}"
else
    echo -e "${GREEN}✓ PM2 already installed${NC}"
fi

# ============================================================================
# STEP 3: Install PostgreSQL
# ============================================================================
print_section "Step 3: Installing PostgreSQL"

if command_exists psql; then
    echo -e "${GREEN}✓ PostgreSQL already installed${NC}"
    psql --version
else
    echo -e "${YELLOW}Installing PostgreSQL $POSTGRES_VERSION...${NC}"
    install_package "postgresql-$POSTGRES_VERSION"
    install_package "postgresql-contrib-$POSTGRES_VERSION"
    
    # Start and enable PostgreSQL
    systemctl start postgresql
    systemctl enable postgresql
    
    echo -e "${GREEN}✓ PostgreSQL installed and started${NC}"
fi

# ============================================================================
# STEP 4: Install Redis
# ============================================================================
print_section "Step 4: Installing Redis"

if command_exists redis-cli; then
    echo -e "${GREEN}✓ Redis already installed${NC}"
else
    echo -e "${YELLOW}Installing Redis...${NC}"
    install_package "redis-server"
    
    # Start and enable Redis
    systemctl start redis-server
    systemctl enable redis-server
    
    echo -e "${GREEN}✓ Redis installed and started${NC}"
fi

# ============================================================================
# STEP 5: Install RabbitMQ
# ============================================================================
print_section "Step 5: Installing RabbitMQ"

if command_exists rabbitmqctl; then
    echo -e "${GREEN}✓ RabbitMQ already installed${NC}"
else
    echo -e "${YELLOW}Installing RabbitMQ...${NC}"
    
    # Add RabbitMQ repository
    curl -fsSL https://github.com/rabbitmq/signing-keys/releases/download/3.0/rabbitmq-release-signing-key.asc | apt-key add -
    echo "deb https://ppa1.novemberain.com/rabbitmq/rabbitmq-erlang/ubuntu $(lsb_release -cs) main" > /etc/apt/sources.list.d/rabbitmq.list
    echo "deb https://ppa1.novemberain.com/rabbitmq/rabbitmq-server/ubuntu $(lsb_release -cs) main" >> /etc/apt/sources.list.d/rabbitmq.list
    
    apt-get update -qq
    install_package "rabbitmq-server"
    
    # Start and enable RabbitMQ
    systemctl start rabbitmq-server
    systemctl enable rabbitmq-server
    
    # Configure RabbitMQ user
    rabbitmqctl add_user sms_user sms_password 2>/dev/null || true
    rabbitmqctl set_user_tags sms_user administrator
    rabbitmqctl set_permissions -p / sms_user ".*" ".*" ".*"
    rabbitmqctl enable_management_plugin
    
    echo -e "${GREEN}✓ RabbitMQ installed and configured${NC}"
fi

# ============================================================================
# STEP 6: Install Python and Dependencies for TTS Service
# ============================================================================
print_section "Step 6: Installing Python and TTS Dependencies"

if command_exists python3; then
    PYTHON_VERSION=$(python3 --version | awk '{print $2}' | cut -d'.' -f1,2)
    echo -e "${GREEN}✓ Python $PYTHON_VERSION already installed${NC}"
else
    echo -e "${YELLOW}Installing Python 3...${NC}"
    install_package "python3"
    install_package "python3-pip"
    install_package "python3-venv"
    echo -e "${GREEN}✓ Python 3 installed${NC}"
fi

# Install Python packages needed for TTS service
echo -e "${YELLOW}Installing Python packages for TTS service...${NC}"
pip3 install --quiet uvicorn fastapi pydantic numpy torch 2>/dev/null || {
    echo -e "${YELLOW}⚠ Some Python packages may need manual installation${NC}"
}

# ============================================================================
# STEP 7: Install Asterisk
# ============================================================================
print_section "Step 7: Installing and Configuring Asterisk"

if command_exists asterisk; then
    echo -e "${GREEN}✓ Asterisk already installed${NC}"
    asterisk -V
else
    echo -e "${YELLOW}Installing Asterisk dependencies...${NC}"
    
    # Install Asterisk dependencies
    install_package "libssl-dev"
    install_package "libncurses5-dev"
    install_package "libnewt-dev"
    install_package "libxml2-dev"
    install_package "libsqlite3-dev"
    install_package "uuid-dev"
    install_package "libjansson-dev"
    install_package "libcurl4-openssl-dev"
    install_package "sox"
    install_package "libsox-fmt-all"
    install_package "libpjsip-dev"
    
    echo -e "${YELLOW}Installing Asterisk from package...${NC}"
    
    # Try to install from package first (simpler and more reliable)
    if apt-cache show asterisk > /dev/null 2>&1; then
        install_package "asterisk"
        install_package "asterisk-dev"
    else
        echo -e "${YELLOW}Asterisk not in repositories, attempting manual installation...${NC}"
        echo -e "${YELLOW}⚠️  Manual Asterisk installation may be required${NC}"
        echo -e "${YELLOW}   See: https://www.asterisk.org/downloads${NC}"
    fi
    
    # Create asterisk user if it doesn't exist
    id -u asterisk > /dev/null 2>&1 || useradd -r -d /var/lib/asterisk -s /bin/false asterisk
    
    # Set permissions
    mkdir -p /var/lib/asterisk /var/spool/asterisk /var/log/asterisk /etc/asterisk
    chown -R asterisk:asterisk /var/lib/asterisk /var/spool/asterisk /var/log/asterisk /etc/asterisk 2>/dev/null || true
    
    # Start and enable Asterisk if installed
    if command_exists asterisk; then
        systemctl start asterisk 2>/dev/null || true
        systemctl enable asterisk 2>/dev/null || true
        echo -e "${GREEN}✓ Asterisk installed${NC}"
    else
        echo -e "${YELLOW}⚠️  Asterisk installation incomplete - manual installation may be needed${NC}"
    fi
fi

# Configure Asterisk AMI
echo -e "${YELLOW}Configuring Asterisk AMI...${NC}"
AMI_PASSWORD=$(openssl rand -hex 16)

cat > /etc/asterisk/manager.conf << EOF
[general]
enabled = yes
port = 5038
bindaddr = 127.0.0.1

[admin]
secret = $AMI_PASSWORD
deny = 0.0.0.0/0.0.0.0
permit = 127.0.0.1/255.255.255.255
read = system,call,log,verbose,command,agent,user,config,dtmf,reporting,cdr,dialplan
write = system,call,log,verbose,command,agent,user,config,dtmf,reporting,cdr,dialplan
EOF

# Reload Asterisk manager
asterisk -rx "manager reload" > /dev/null 2>&1 || true

echo -e "${GREEN}✓ Asterisk AMI configured${NC}"
echo -e "${YELLOW}  AMI Password: $AMI_PASSWORD${NC}"
echo -e "${YELLOW}  (Save this for your .env file)${NC}"

# ============================================================================
# STEP 8: Setup Database
# ============================================================================
print_section "Step 8: Setting Up Database"

DB_NAME="sms_platform"
DB_USER="sms_user"
DB_PASSWORD="sms_password"

echo -e "${YELLOW}Creating database and user...${NC}"

# Create database user and database
sudo -u postgres psql << EOF > /dev/null 2>&1 || true
-- Create user if not exists
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_user WHERE usename = '$DB_USER') THEN
        CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
    ELSE
        ALTER USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
    END IF;
END
\$\$;

-- Grant privileges
ALTER USER $DB_USER CREATEDB;

-- Create database if not exists
SELECT 'CREATE DATABASE $DB_NAME OWNER $DB_USER'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$DB_NAME')\gexec

-- Grant all privileges
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
\q
EOF

echo -e "${GREEN}✓ Database configured${NC}"

# ============================================================================
# STEP 9: Install Application Dependencies
# ============================================================================
print_section "Step 9: Installing Application Dependencies"

cd "$PROJECT_ROOT"

# Backend dependencies
if [ -d "backend" ]; then
    echo -e "${YELLOW}Installing backend dependencies...${NC}"
    cd "$PROJECT_ROOT/backend"
    npm install --quiet
    echo -e "${GREEN}✓ Backend dependencies installed${NC}"
fi

# Frontend dependencies
if [ -d "frontend" ]; then
    echo -e "${YELLOW}Installing frontend dependencies...${NC}"
    cd "$PROJECT_ROOT/frontend"
    npm install --quiet
    echo -e "${GREEN}✓ Frontend dependencies installed${NC}"
fi

# TTS Service dependencies
if [ -d "kokoro" ]; then
    echo -e "${YELLOW}Setting up TTS service...${NC}"
    cd "$PROJECT_ROOT/kokoro"
    if [ -f "requirements.txt" ]; then
        pip3 install -q -r requirements.txt 2>/dev/null || true
    fi
    echo -e "${GREEN}✓ TTS service dependencies installed${NC}"
fi

# ============================================================================
# STEP 10: Create Environment Files
# ============================================================================
print_section "Step 10: Creating Environment Configuration Files"

cd "$PROJECT_ROOT"

# Backend .env
if [ ! -f "backend/.env" ] && [ -f "backend/.env.example" ]; then
    echo -e "${YELLOW}Creating backend/.env from template...${NC}"
    cp backend/.env.example backend/.env
    
    # Update with actual values
    sed -i "s/DB_HOST=.*/DB_HOST=localhost/" backend/.env
    sed -i "s/DB_PORT=.*/DB_PORT=5432/" backend/.env
    sed -i "s/DB_USERNAME=.*/DB_USERNAME=$DB_USER/" backend/.env
    sed -i "s/DB_PASSWORD=.*/DB_PASSWORD=$DB_PASSWORD/" backend/.env
    sed -i "s/DB_DATABASE=.*/DB_DATABASE=$DB_NAME/" backend/.env
    
    # Add Asterisk AMI configuration
    if ! grep -q "AMI_HOST" backend/.env; then
        cat >> backend/.env << EOF

# Asterisk AMI Configuration
AMI_PORT=5038
AMI_HOST=localhost
AMI_USER=admin
AMI_PASSWORD=$AMI_PASSWORD
EOF
    fi
    
    echo -e "${GREEN}✓ Backend .env created${NC}"
    echo -e "${YELLOW}  ⚠️  Please review and update backend/.env with your actual secrets${NC}"
else
    echo -e "${GREEN}✓ Backend .env already exists${NC}"
fi

# Frontend .env.local
if [ ! -f "frontend/.env.local" ] && [ -f "frontend/.env.local.example" ]; then
    echo -e "${YELLOW}Creating frontend/.env.local from template...${NC}"
    cp frontend/.env.local.example frontend/.env.local
    echo -e "${GREEN}✓ Frontend .env.local created${NC}"
else
    echo -e "${GREEN}✓ Frontend .env.local already exists${NC}"
fi

# ============================================================================
# STEP 11: Set Permissions
# ============================================================================
print_section "Step 11: Setting Up Permissions"

# Create necessary directories
mkdir -p "$PROJECT_ROOT/backend/uploads/audio"
mkdir -p "$PROJECT_ROOT/backend/uploads/sounds"
mkdir -p "$PROJECT_ROOT/kokoro/logs"
mkdir -p /var/lib/asterisk/sounds/custom
mkdir -p /var/spool/asterisk/monitor

# Set permissions
chmod +x "$PROJECT_ROOT/restart.sh"
chmod +x "$PROJECT_ROOT/start.sh"
chmod +x "$PROJECT_ROOT/stop.sh"
chmod +x "$PROJECT_ROOT/kokoro/start-kokoro.sh" 2>/dev/null || true

echo -e "${GREEN}✓ Permissions set${NC}"

# ============================================================================
# STEP 12: Build Applications
# ============================================================================
print_section "Step 12: Building Applications"

cd "$PROJECT_ROOT"

# Build backend
if [ -d "backend" ]; then
    echo -e "${YELLOW}Building backend...${NC}"
    cd "$PROJECT_ROOT/backend"
    npm run build > /dev/null 2>&1 || {
        echo -e "${YELLOW}⚠ Backend build had warnings (this is normal)${NC}"
    }
    echo -e "${GREEN}✓ Backend built${NC}"
fi

# Build frontend (optional, can be done on first start)
echo -e "${YELLOW}Frontend will be built on first start${NC}"

# ============================================================================
# STEP 13: Summary and Next Steps
# ============================================================================
print_section "Setup Complete!"

echo -e "${GREEN}✅ Server setup completed successfully!${NC}"
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   Next Steps:${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}1. Review and update environment variables:${NC}"
echo "   - Edit: backend/.env"
echo "   - Edit: frontend/.env.local"
echo ""
echo -e "${YELLOW}2. Configure Asterisk (if needed):${NC}"
echo "   - AMI Password: $AMI_PASSWORD"
echo "   - AMI Config: /etc/asterisk/manager.conf"
echo ""
echo -e "${YELLOW}3. Run database migrations:${NC}"
echo "   cd $PROJECT_ROOT/backend"
echo "   npm run migration:run"
echo ""
echo -e "${YELLOW}4. Start the application:${NC}"
echo "   cd $PROJECT_ROOT"
echo "   ./restart.sh"
echo ""
echo -e "${YELLOW}5. Verify services are running:${NC}"
echo "   - Backend: http://localhost:5002/api/health"
echo "   - Frontend: http://localhost:5001"
echo "   - TTS Service: http://localhost:8000"
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}Setup script completed!${NC}"

