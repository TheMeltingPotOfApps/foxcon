#!/bin/bash
# Run the lead statuses migration

echo "Running lead statuses migration..."

# Get database connection details from environment or use defaults
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USERNAME="${DB_USERNAME:-sms_user}"
DB_PASSWORD="${DB_PASSWORD:-sms_password}"
DB_DATABASE="${DB_DATABASE:-sms_platform}"

echo "Connecting to database: $DB_DATABASE@$DB_HOST:$DB_PORT"

# Run the migration
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_DATABASE" -f migrations/create-lead-statuses-tables.sql

if [ $? -eq 0 ]; then
    echo "✅ Migration completed successfully!"
else
    echo "❌ Migration failed. Please check the error above."
    exit 1
fi

