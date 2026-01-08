#!/bin/bash

# Setup script for new PostgreSQL database instance
# This script helps set up a new PostgreSQL instance with optimal configuration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}=== New PostgreSQL Database Setup ===${NC}"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
  echo -e "${RED}Please run as root or with sudo${NC}"
  exit 1
fi

# Detect OS
if [ -f /etc/os-release ]; then
  . /etc/os-release
  OS=$ID
else
  echo -e "${RED}Cannot detect OS${NC}"
  exit 1
fi

echo "Detected OS: $OS"
echo ""

# Install PostgreSQL if not installed
if ! command -v psql &> /dev/null; then
  echo -e "${YELLOW}PostgreSQL not found. Installing...${NC}"
  
  if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
    apt-get update
    apt-get install -y postgresql postgresql-contrib
  elif [ "$OS" = "centos" ] || [ "$OS" = "rhel" ]; then
    yum install -y postgresql-server postgresql-contrib
    postgresql-setup --initdb
  else
    echo -e "${RED}Unsupported OS. Please install PostgreSQL manually.${NC}"
    exit 1
  fi
fi

# Get PostgreSQL version
PG_VERSION=$(psql --version | awk '{print $3}' | cut -d. -f1,2)
echo -e "${GREEN}PostgreSQL version: $PG_VERSION${NC}"

# Find PostgreSQL data directory
if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
  PG_DATA_DIR=$(sudo -u postgres psql -t -c "SHOW data_directory;" | xargs)
elif [ "$OS" = "centos" ] || [ "$OS" = "rhel" ]; then
  PG_DATA_DIR="/var/lib/pgsql/data"
fi

echo "PostgreSQL data directory: $PG_DATA_DIR"
echo ""

# Prompt for database configuration
read -p "Enter database name [sms_platform]: " DB_NAME
DB_NAME=${DB_NAME:-sms_platform}

read -p "Enter database username [sms_user]: " DB_USER
DB_USER=${DB_USER:-sms_user}

read -sp "Enter database password: " DB_PASSWORD
echo ""

if [ -z "$DB_PASSWORD" ]; then
  echo -e "${RED}Password is required${NC}"
  exit 1
fi

# Create database and user
echo ""
echo -e "${YELLOW}Creating database and user...${NC}"

sudo -u postgres psql <<EOF
-- Create user
CREATE USER "$DB_USER" WITH PASSWORD '$DB_PASSWORD';

-- Create database
CREATE DATABASE "$DB_NAME" OWNER "$DB_USER";

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE "$DB_NAME" TO "$DB_USER";

-- Connect to database and grant schema privileges
\c "$DB_NAME"
GRANT ALL ON SCHEMA public TO "$DB_USER";
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO "$DB_USER";
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO "$DB_USER";
EOF

echo -e "${GREEN}✓ Database and user created${NC}"

# Optimize PostgreSQL configuration
echo ""
echo -e "${YELLOW}Optimizing PostgreSQL configuration...${NC}"

PG_CONF="$PG_DATA_DIR/postgresql.conf"

# Backup original config
cp "$PG_CONF" "$PG_CONF.backup.$(date +%Y%m%d_%H%M%S)"

# Calculate optimal settings based on available memory
TOTAL_MEM=$(free -g | awk '/^Mem:/{print $2}')
SHARED_BUFFERS=$((TOTAL_MEM / 4))
if [ $SHARED_BUFFERS -gt 8 ]; then
  SHARED_BUFFERS=8
fi
EFFECTIVE_CACHE_SIZE=$((TOTAL_MEM * 3 / 4))
MAINTENANCE_WORK_MEM=$((TOTAL_MEM / 8))
if [ $MAINTENANCE_WORK_MEM -gt 2 ]; then
  MAINTENANCE_WORK_MEM=2
fi
WORK_MEM=$((TOTAL_MEM / 16))
if [ $WORK_MEM -gt 256 ]; then
  WORK_MEM=256
fi

# Update configuration
cat >> "$PG_CONF" <<EOF

# SMS Platform Optimizations (added $(date))
shared_buffers = ${SHARED_BUFFERS}GB
effective_cache_size = ${EFFECTIVE_CACHE_SIZE}GB
maintenance_work_mem = ${MAINTENANCE_WORK_MEM}GB
work_mem = ${WORK_MEM}MB
max_connections = 200
max_worker_processes = 4
max_parallel_workers_per_gather = 2
max_parallel_workers = 4
max_parallel_maintenance_workers = 2
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
min_wal_size = 1GB
max_wal_size = 4GB
EOF

# Configure pg_hba.conf for remote connections
PG_HBA="$PG_DATA_DIR/pg_hba.conf"
if ! grep -q "SMS Platform" "$PG_HBA"; then
  cat >> "$PG_HBA" <<EOF

# SMS Platform remote connections (added $(date))
host    $DB_NAME    $DB_USER    0.0.0.0/0    md5
EOF
fi

# Configure postgresql.conf for remote connections
if ! grep -q "listen_addresses" "$PG_CONF" || grep -q "^#listen_addresses" "$PG_CONF"; then
  sed -i "s/^#listen_addresses = 'localhost'/listen_addresses = '*'/" "$PG_CONF"
fi

echo -e "${GREEN}✓ Configuration optimized${NC}"

# Restart PostgreSQL
echo ""
echo -e "${YELLOW}Restarting PostgreSQL...${NC}"
if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
  systemctl restart postgresql
elif [ "$OS" = "centos" ] || [ "$OS" = "rhel" ]; then
  systemctl restart postgresql
fi

sleep 2

# Verify connection
if sudo -u postgres psql -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
  echo -e "${GREEN}✓ PostgreSQL restarted and verified${NC}"
else
  echo -e "${RED}Warning: Could not verify connection. Please check manually.${NC}"
fi

# Create connection pooler configuration (pgBouncer recommended)
echo ""
echo -e "${YELLOW}Connection Pooling Recommendation:${NC}"
echo "For better performance with Asterisk and application connections,"
echo "consider installing pgBouncer as a connection pooler."
echo ""
echo "Installation:"
echo "  apt-get install pgbouncer  # Ubuntu/Debian"
echo "  yum install pgbouncer      # CentOS/RHEL"
echo ""

# Summary
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Database Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Database Configuration:"
echo "  Host: $(hostname -I | awk '{print $1}')"
echo "  Port: 5432"
echo "  Database: $DB_NAME"
echo "  Username: $DB_USER"
echo "  Password: [hidden]"
echo ""
echo "Connection String:"
echo "  postgresql://$DB_USER:[password]@$(hostname -I | awk '{print $1}'):5432/$DB_NAME"
echo ""
echo "Next Steps:"
echo "1. Update firewall rules to allow PostgreSQL connections"
echo "2. Run the migration script: ./scripts/migrate-to-new-db.sh"
echo "3. Consider setting up pgBouncer for connection pooling"
echo ""

