#!/bin/bash

# Database Migration Script
# Migrates the SMS platform database to a new database instance
# This script handles data migration, schema creation, and connection updates

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Load environment variables
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

# Source database (current)
OLD_DB_HOST=${DB_HOST:-localhost}
OLD_DB_PORT=${DB_PORT:-5432}
OLD_DB_USERNAME=${DB_USERNAME:-sms_user}
OLD_DB_PASSWORD=${DB_PASSWORD:-sms_password}
OLD_DB_DATABASE=${DB_DATABASE:-sms_platform}

# Target database (new instance)
echo -e "${YELLOW}=== Database Migration Setup ===${NC}"
echo ""
echo "Current Database Configuration:"
echo "  Host: $OLD_DB_HOST"
echo "  Port: $OLD_DB_PORT"
echo "  Database: $OLD_DB_DATABASE"
echo "  Username: $OLD_DB_USERNAME"
echo ""

read -p "Enter NEW database host: " NEW_DB_HOST
read -p "Enter NEW database port [5432]: " NEW_DB_PORT
NEW_DB_PORT=${NEW_DB_PORT:-5432}
read -p "Enter NEW database name [sms_platform]: " NEW_DB_DATABASE
NEW_DB_DATABASE=${NEW_DB_DATABASE:-sms_platform}
read -p "Enter NEW database username: " NEW_DB_USERNAME
read -sp "Enter NEW database password: " NEW_DB_PASSWORD
echo ""

# Validate inputs
if [ -z "$NEW_DB_HOST" ] || [ -z "$NEW_DB_USERNAME" ] || [ -z "$NEW_DB_PASSWORD" ]; then
  echo -e "${RED}Error: All database credentials are required${NC}"
  exit 1
fi

echo ""
echo -e "${YELLOW}Target Database Configuration:${NC}"
echo "  Host: $NEW_DB_HOST"
echo "  Port: $NEW_DB_PORT"
echo "  Database: $NEW_DB_DATABASE"
echo "  Username: $NEW_DB_USERNAME"
echo ""

read -p "Continue with migration? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
  echo "Migration cancelled."
  exit 0
fi

# Export passwords for psql
export PGPASSWORD=$OLD_DB_PASSWORD
export NEW_PGPASSWORD=$NEW_DB_PASSWORD

# Create temporary directory for dumps
TMP_DIR=$(mktemp -d)
echo -e "${GREEN}Created temporary directory: $TMP_DIR${NC}"

# Step 1: Create database dump
echo ""
echo -e "${YELLOW}Step 1: Creating database dump...${NC}"
pg_dump -h "$OLD_DB_HOST" -p "$OLD_DB_PORT" -U "$OLD_DB_USERNAME" -d "$OLD_DB_DATABASE" \
  --format=custom \
  --file="$TMP_DIR/database.dump" \
  --verbose

if [ $? -ne 0 ]; then
  echo -e "${RED}Error: Failed to create database dump${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Database dump created successfully${NC}"

# Step 2: Create schema-only dump for verification
echo ""
echo -e "${YELLOW}Step 2: Creating schema dump...${NC}"
pg_dump -h "$OLD_DB_HOST" -p "$OLD_DB_PORT" -U "$OLD_DB_USERNAME" -d "$OLD_DB_DATABASE" \
  --schema-only \
  --file="$TMP_DIR/schema.sql" \
  --verbose

echo -e "${GREEN}✓ Schema dump created${NC}"

# Step 3: Test connection to new database
echo ""
echo -e "${YELLOW}Step 3: Testing connection to new database...${NC}"
PGPASSWORD=$NEW_DB_PASSWORD psql -h "$NEW_DB_HOST" -p "$NEW_DB_PORT" -U "$NEW_DB_USERNAME" -d postgres -c "SELECT 1;" > /dev/null 2>&1

if [ $? -ne 0 ]; then
  echo -e "${RED}Error: Cannot connect to new database. Please check credentials.${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Connection to new database successful${NC}"

# Step 4: Create database if it doesn't exist
echo ""
echo -e "${YELLOW}Step 4: Creating target database...${NC}"
PGPASSWORD=$NEW_DB_PASSWORD psql -h "$NEW_DB_HOST" -p "$NEW_DB_PORT" -U "$NEW_DB_USERNAME" -d postgres <<EOF
SELECT 'CREATE DATABASE "$NEW_DB_DATABASE"'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$NEW_DB_DATABASE')\gexec
EOF

echo -e "${GREEN}✓ Target database ready${NC}"

# Step 5: Restore database dump
echo ""
echo -e "${YELLOW}Step 5: Restoring database to new instance...${NC}"
echo "This may take several minutes depending on database size..."
PGPASSWORD=$NEW_DB_PASSWORD pg_restore -h "$NEW_DB_HOST" -p "$NEW_DB_PORT" -U "$NEW_DB_USERNAME" -d "$NEW_DB_DATABASE" \
  --verbose \
  --no-owner \
  --no-acl \
  "$TMP_DIR/database.dump"

if [ $? -ne 0 ]; then
  echo -e "${RED}Error: Failed to restore database${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Database restored successfully${NC}"

# Step 6: Run all migrations to ensure schema is up to date
echo ""
echo -e "${YELLOW}Step 6: Running migrations...${NC}"
cd "$(dirname "$0")/.."
for migration in migrations/*.sql; do
  if [ -f "$migration" ]; then
    echo "Running migration: $(basename "$migration")"
    PGPASSWORD=$NEW_DB_PASSWORD psql -h "$NEW_DB_HOST" -p "$NEW_DB_PORT" -U "$NEW_DB_USERNAME" -d "$NEW_DB_DATABASE" -f "$migration" > /dev/null 2>&1 || true
  fi
done

echo -e "${GREEN}✓ Migrations completed${NC}"

# Step 7: Update .env file
echo ""
echo -e "${YELLOW}Step 7: Updating configuration...${NC}"
if [ -f .env ]; then
  # Backup current .env
  cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
  
  # Update database configuration
  sed -i "s|^DB_HOST=.*|DB_HOST=$NEW_DB_HOST|" .env
  sed -i "s|^DB_PORT=.*|DB_PORT=$NEW_DB_PORT|" .env
  sed -i "s|^DB_USERNAME=.*|DB_USERNAME=$NEW_DB_USERNAME|" .env
  sed -i "s|^DB_PASSWORD=.*|DB_PASSWORD=$NEW_DB_PASSWORD|" .env
  sed -i "s|^DB_DATABASE=.*|DB_DATABASE=$NEW_DB_DATABASE|" .env
  
  echo -e "${GREEN}✓ Configuration updated (.env.backup.* created)${NC}"
else
  echo -e "${YELLOW}Warning: .env file not found. Please update manually:${NC}"
  echo "  DB_HOST=$NEW_DB_HOST"
  echo "  DB_PORT=$NEW_DB_PORT"
  echo "  DB_USERNAME=$NEW_DB_USERNAME"
  echo "  DB_PASSWORD=$NEW_DB_PASSWORD"
  echo "  DB_DATABASE=$NEW_DB_DATABASE"
fi

# Step 8: Verify data integrity
echo ""
echo -e "${YELLOW}Step 8: Verifying data integrity...${NC}"

# Count records in key tables
OLD_COUNT=$(PGPASSWORD=$OLD_DB_PASSWORD psql -h "$OLD_DB_HOST" -p "$OLD_DB_PORT" -U "$OLD_DB_USERNAME" -d "$OLD_DB_DATABASE" -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | xargs)
NEW_COUNT=$(PGPASSWORD=$NEW_DB_PASSWORD psql -h "$NEW_DB_HOST" -p "$NEW_DB_PORT" -U "$NEW_DB_USERNAME" -d "$NEW_DB_DATABASE" -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | xargs)

if [ "$OLD_COUNT" = "$NEW_COUNT" ]; then
  echo -e "${GREEN}✓ Data verification passed (users: $OLD_COUNT)${NC}"
else
  echo -e "${RED}Warning: Record counts don't match (Old: $OLD_COUNT, New: $NEW_COUNT)${NC}"
fi

# Cleanup
echo ""
echo -e "${YELLOW}Cleaning up temporary files...${NC}"
rm -rf "$TMP_DIR"
echo -e "${GREEN}✓ Cleanup complete${NC}"

# Summary
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Migration Completed Successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Next steps:"
echo "1. Restart the backend service: ./restart.sh"
echo "2. Verify the application is working correctly"
echo "3. Monitor logs for any connection issues"
echo "4. Once verified, you can stop the old database instance"
echo ""
echo "New Database Connection:"
echo "  Host: $NEW_DB_HOST"
echo "  Port: $NEW_DB_PORT"
echo "  Database: $NEW_DB_DATABASE"
echo "  Username: $NEW_DB_USERNAME"
echo ""

