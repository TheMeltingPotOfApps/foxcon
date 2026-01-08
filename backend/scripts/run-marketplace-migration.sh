#!/bin/bash

# Script to run marketplace authentication migration
# Reads database credentials from .env file or uses defaults
# Usage: ./scripts/run-marketplace-migration.sh

set -e

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$BACKEND_DIR/.env"

# Function to read .env file
load_env() {
    if [ -f "$ENV_FILE" ]; then
        export $(grep -v '^#' "$ENV_FILE" | grep -E "^(DB_|DATABASE_)" | xargs)
    fi
}

# Load environment variables from .env
load_env

# Get database credentials from .env or use defaults
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_DATABASE:-${DB_NAME:-sms_platform}}"
DB_USER="${DB_USERNAME:-${DB_USER:-sms_user}}"
DB_PASSWORD="${DB_PASSWORD:-sms_password}"

# Export password for psql
export PGPASSWORD="$DB_PASSWORD"

echo "Running marketplace authentication migration..."
echo "Host: $DB_HOST"
echo "Port: $DB_PORT"
echo "Database: $DB_NAME"
echo "User: $DB_USER"
echo ""

# Check if migration file exists (use the migration script that handles old table)
MIGRATION_FILE="$BACKEND_DIR/migrations/migrate-marketplace-users.sql"
if [ ! -f "$MIGRATION_FILE" ]; then
    # Fallback to original migration file
    MIGRATION_FILE="$BACKEND_DIR/migrations/create-marketplace-auth-tables.sql"
    if [ ! -f "$MIGRATION_FILE" ]; then
        echo "Error: Migration file not found"
        exit 1
    fi
fi

# Run migration
echo "Executing migration..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$MIGRATION_FILE"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration completed successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Restart the backend server"
    echo "2. Test marketplace authentication endpoints"
    echo "3. Create marketplace user accounts"
else
    echo ""
    echo "❌ Migration failed. Please check the error messages above."
    exit 1
fi

# Clear password from environment
unset PGPASSWORD

