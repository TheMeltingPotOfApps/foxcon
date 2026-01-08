#!/bin/bash

# Optimize PostgreSQL for increased connection pool and availability
# This script increases max_connections and optimizes connection settings

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}=== PostgreSQL Connection Pool Optimization ===${NC}"
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

# Find PostgreSQL data directory
if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
  PG_DATA_DIR=$(sudo -u postgres psql -t -c "SHOW data_directory;" 2>/dev/null | xargs || echo "/var/lib/postgresql/$(psql --version | awk '{print $3}' | cut -d. -f1)/main/data")
elif [ "$OS" = "centos" ] || [ "$OS" = "rhel" ]; then
  PG_DATA_DIR="/var/lib/pgsql/data"
else
  echo -e "${RED}Unsupported OS${NC}"
  exit 1
fi

if [ ! -d "$PG_DATA_DIR" ]; then
  echo -e "${RED}PostgreSQL data directory not found: $PG_DATA_DIR${NC}"
  exit 1
fi

PG_CONF="$PG_DATA_DIR/postgresql.conf"

if [ ! -f "$PG_CONF" ]; then
  echo -e "${RED}PostgreSQL config file not found: $PG_CONF${NC}"
  exit 1
fi

echo "PostgreSQL config: $PG_CONF"
echo ""

# Backup config
BACKUP_FILE="$PG_CONF.backup.$(date +%Y%m%d_%H%M%S)"
cp "$PG_CONF" "$BACKUP_FILE"
echo -e "${GREEN}✓ Config backed up to: $BACKUP_FILE${NC}"

# Get current max_connections
CURRENT_MAX=$(grep "^max_connections" "$PG_CONF" | awk '{print $3}' | tr -d "'" || echo "100")
echo "Current max_connections: $CURRENT_MAX"

# Calculate optimal max_connections
# Formula: (RAM in GB * 2) + 50, but cap at reasonable limits
TOTAL_MEM=$(free -g | awk '/^Mem:/{print $2}')
CALCULATED_MAX=$((TOTAL_MEM * 2 + 50))
if [ $CALCULATED_MAX -gt 200 ]; then
  CALCULATED_MAX=200
fi
if [ $CALCULATED_MAX -lt 150 ]; then
  CALCULATED_MAX=150
fi

echo "Recommended max_connections: $CALCULATED_MAX"
read -p "Enter max_connections [$CALCULATED_MAX]: " NEW_MAX
NEW_MAX=${NEW_MAX:-$CALCULATED_MAX}

# Update max_connections
if grep -q "^max_connections" "$PG_CONF"; then
  sed -i "s/^max_connections = .*/max_connections = $NEW_MAX/" "$PG_CONF"
else
  echo "max_connections = $NEW_MAX" >> "$PG_CONF"
fi

# Update shared_buffers based on max_connections
# shared_buffers should be about 25% of RAM, but also consider max_connections
SHARED_BUFFERS=$((TOTAL_MEM / 4))
if [ $SHARED_BUFFERS -gt 8 ]; then
  SHARED_BUFFERS=8
fi

# Calculate work_mem based on max_connections
# work_mem = (RAM - shared_buffers) / (max_connections * 2)
AVAILABLE_MEM=$((TOTAL_MEM - SHARED_BUFFERS))
WORK_MEM=$((AVAILABLE_MEM * 1024 / NEW_MAX / 2))
if [ $WORK_MEM -gt 256 ]; then
  WORK_MEM=256
fi
if [ $WORK_MEM -lt 64 ]; then
  WORK_MEM=64
fi

# Update or add connection-related settings
cat >> "$PG_CONF" <<EOF

# Connection Pool Optimizations (added $(date))
shared_buffers = ${SHARED_BUFFERS}GB
work_mem = ${WORK_MEM}MB
maintenance_work_mem = 2GB
effective_cache_size = $((TOTAL_MEM * 3 / 4))GB
max_connections = $NEW_MAX
superuser_reserved_connections = 3
# Connection timeout settings
tcp_keepalives_idle = 600
tcp_keepalives_interval = 30
tcp_keepalives_count = 3
# Statement timeout (prevent long-running queries from holding connections)
statement_timeout = 60000
# Idle transaction timeout
idle_in_transaction_session_timeout = 300000
EOF

echo -e "${GREEN}✓ Configuration updated${NC}"

# Restart PostgreSQL
echo ""
echo -e "${YELLOW}Restarting PostgreSQL...${NC}"
if systemctl restart postgresql; then
  sleep 3
  if systemctl is-active --quiet postgresql; then
    echo -e "${GREEN}✓ PostgreSQL restarted successfully${NC}"
  else
    echo -e "${RED}✗ PostgreSQL failed to start. Restoring backup...${NC}"
    cp "$BACKUP_FILE" "$PG_CONF"
    systemctl restart postgresql
    exit 1
  fi
else
  echo -e "${RED}✗ Failed to restart PostgreSQL${NC}"
  exit 1
fi

# Verify new settings
echo ""
echo -e "${YELLOW}Verifying new settings...${NC}"
NEW_MAX_VERIFY=$(sudo -u postgres psql -t -c "SHOW max_connections;" | xargs)
echo "max_connections: $NEW_MAX_VERIFY"

if [ "$NEW_MAX_VERIFY" = "$NEW_MAX" ]; then
  echo -e "${GREEN}✓ Settings verified${NC}"
else
  echo -e "${YELLOW}⚠ Warning: max_connections doesn't match expected value${NC}"
fi

# Show current connection count
CURRENT_CONNECTIONS=$(sudo -u postgres psql -t -c "SELECT COUNT(*) FROM pg_stat_activity;" | xargs)
echo "Current active connections: $CURRENT_CONNECTIONS"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Optimization Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "New Settings:"
echo "  max_connections: $NEW_MAX"
echo "  shared_buffers: ${SHARED_BUFFERS}GB"
echo "  work_mem: ${WORK_MEM}MB"
echo ""
echo "Backup saved to: $BACKUP_FILE"
echo ""

