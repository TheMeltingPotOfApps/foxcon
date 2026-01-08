#!/bin/bash

# Script to run the timezone migration
# This adds timezone columns to users and contacts tables

set -e

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Database connection parameters
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-sms}"
DB_USER="${DB_USER:-postgres}"

# Use PGPASSWORD environment variable if set, otherwise prompt
if [ -z "$PGPASSWORD" ] && [ -z "$DB_PASSWORD" ]; then
  echo "Please set DB_PASSWORD environment variable or PGPASSWORD"
  exit 1
fi

export PGPASSWORD="${DB_PASSWORD:-$PGPASSWORD}"

echo "Running timezone migration..."
echo "Database: $DB_NAME on $DB_HOST:$DB_PORT"

# Run the migration
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f migrations/add-timezone-to-users-and-contacts.sql

echo "✅ Timezone migration completed successfully!"

