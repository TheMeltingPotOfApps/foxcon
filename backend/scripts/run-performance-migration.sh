#!/bin/bash

# Script to run performance optimization migration
# This adds critical indexes for database performance improvements

set -e

echo "Running performance optimization migration..."

# Get database connection details from environment or use defaults
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USERNAME="${DB_USERNAME:-postgres}"
DB_DATABASE="${DB_DATABASE:-sms_saas}"

# Check if password is provided
if [ -z "$DB_PASSWORD" ]; then
    echo "Error: DB_PASSWORD environment variable is not set"
    echo "Usage: DB_PASSWORD=your_password ./scripts/run-performance-migration.sh"
    exit 1
fi

# Run the migration
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_DATABASE" -f "$(dirname "$0")/../migrations/add-performance-indexes.sql"

echo "Performance optimization migration completed successfully!"
echo ""
echo "Indexes added:"
echo "  - journey_node_executions: node_contact_tenant, executed_at, contact_tenant_executed"
echo "  - journey_contacts: active (partial), journey_tenant_status"
echo "  - journey_nodes: journey_id_tenant"
echo "  - messages: created_at, conversation_created_at"
echo "  - call_logs: created_at, tenant_created_status"
echo "  - contacts: created_at, tenant_created_at"
echo ""
echo "Tables analyzed for optimal query planning."

