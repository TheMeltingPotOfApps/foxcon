#!/bin/bash

# Script to run Kokoro voice fields migration
# Reads database credentials from environment variables or .env file

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Running Kokoro Voice Fields Migration${NC}\n"

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Load environment variables from .env file if it exists
if [ -f "$BACKEND_DIR/.env" ]; then
    export $(grep -v '^#' "$BACKEND_DIR/.env" | grep -E '^DB_' | xargs)
fi

# Set defaults if not set
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_USERNAME=${DB_USERNAME:-sms_user}
DB_PASSWORD=${DB_PASSWORD:-sms_password}
DB_DATABASE=${DB_DATABASE:-sms_platform}

echo "Database Configuration:"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo "  Database: $DB_DATABASE"
echo "  Username: $DB_USERNAME"
echo ""

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ psql command not found. Please install PostgreSQL client tools.${NC}"
    exit 1
fi

# Test database connection
echo -e "${YELLOW}Testing database connection...${NC}"
export PGPASSWORD="$DB_PASSWORD"
if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_DATABASE" -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${RED}❌ Failed to connect to database${NC}"
    echo "Please check your database credentials and ensure PostgreSQL is running."
    exit 1
fi
echo -e "${GREEN}✅ Database connection successful${NC}\n"

# Run the migration
echo -e "${YELLOW}Running migration...${NC}"
MIGRATION_FILE="$BACKEND_DIR/migrations/add-kokoro-voice-fields.sql"

if [ ! -f "$MIGRATION_FILE" ]; then
    echo -e "${RED}❌ Migration file not found: $MIGRATION_FILE${NC}"
    exit 1
fi

psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_DATABASE" -f "$MIGRATION_FILE"

if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}✅ Migration completed successfully!${NC}"
    echo ""
    echo "Verifying migration..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_DATABASE" -c "\d voice_templates" | grep -E "kokoroVoiceId|kokoroVoiceName" || echo "Columns may already exist"
else
    echo -e "\n${RED}❌ Migration failed${NC}"
    exit 1
fi

echo -e "\n${GREEN}✨ Migration complete!${NC}"
