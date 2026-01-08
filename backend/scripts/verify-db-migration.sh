#!/bin/bash

# Verification script after database migration
# Checks data integrity, connection health, and performance

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Load environment variables
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_USERNAME=${DB_USERNAME:-sms_user}
DB_PASSWORD=${DB_PASSWORD:-sms_password}
DB_DATABASE=${DB_DATABASE:-sms_platform}

export PGPASSWORD=$DB_PASSWORD

echo -e "${YELLOW}=== Database Migration Verification ===${NC}"
echo ""

# Test 1: Connection Test
echo -e "${YELLOW}Test 1: Connection Test${NC}"
if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_DATABASE" -c "SELECT 1;" > /dev/null 2>&1; then
  echo -e "${GREEN}✓ Connection successful${NC}"
else
  echo -e "${RED}✗ Connection failed${NC}"
  exit 1
fi

# Test 2: Table Count
echo ""
echo -e "${YELLOW}Test 2: Table Count${NC}"
TABLE_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_DATABASE" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | xargs)
echo "Tables found: $TABLE_COUNT"
if [ "$TABLE_COUNT" -gt 20 ]; then
  echo -e "${GREEN}✓ Table count looks good${NC}"
else
  echo -e "${RED}✗ Warning: Low table count${NC}"
fi

# Test 3: Key Table Record Counts
echo ""
echo -e "${YELLOW}Test 3: Key Table Record Counts${NC}"

check_table() {
  local table=$1
  local count=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_DATABASE" -t -c "SELECT COUNT(*) FROM $table;" 2>/dev/null | xargs)
  if [ -n "$count" ]; then
    echo "  $table: $count records"
    return 0
  else
    echo "  $table: Table not found or error"
    return 1
  fi
}

check_table "users"
check_table "tenants"
check_table "contacts"
check_table "journeys"
check_table "journey_nodes"
check_table "journey_contacts"
check_table "journey_node_executions"
check_table "call_logs"
check_table "messages"
check_table "conversations"

# Test 4: Index Verification
echo ""
echo -e "${YELLOW}Test 4: Index Verification${NC}"
INDEX_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_DATABASE" -t -c "SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public';" | xargs)
echo "Indexes found: $INDEX_COUNT"
if [ "$INDEX_COUNT" -gt 50 ]; then
  echo -e "${GREEN}✓ Index count looks good${NC}"
else
  echo -e "${YELLOW}⚠ Warning: Low index count. Run migrations.${NC}"
fi

# Test 5: Check Critical Indexes
echo ""
echo -e "${YELLOW}Test 5: Critical Indexes${NC}"

check_index() {
  local index=$1
  local exists=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_DATABASE" -t -c "SELECT COUNT(*) FROM pg_indexes WHERE indexname = '$index';" | xargs)
  if [ "$exists" = "1" ]; then
    echo -e "  ${GREEN}✓${NC} $index"
    return 0
  else
    echo -e "  ${RED}✗${NC} $index (missing)"
    return 1
  fi
}

check_index "idx_journey_node_executions_tenant_status_scheduled"
check_index "idx_journey_contacts_journey_status"
check_index "idx_contacts_tenant_phone"
check_index "idx_call_logs_metadata_gin"
check_index "idx_generated_audio_variable_values_gin"

# Test 6: Performance Test
echo ""
echo -e "${YELLOW}Test 6: Performance Test${NC}"
START_TIME=$(date +%s%N)
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_DATABASE" -c "SELECT COUNT(*) FROM journey_node_executions WHERE status = 'PENDING';" > /dev/null 2>&1
END_TIME=$(date +%s%N)
DURATION=$((($END_TIME - $START_TIME) / 1000000))
echo "Query execution time: ${DURATION}ms"
if [ "$DURATION" -lt 1000 ]; then
  echo -e "${GREEN}✓ Query performance is good${NC}"
else
  echo -e "${YELLOW}⚠ Query is slow. Check indexes.${NC}"
fi

# Test 7: Connection Pool Test
echo ""
echo -e "${YELLOW}Test 7: Connection Pool Test${NC}"
ACTIVE_CONNECTIONS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_DATABASE" -t -c "SELECT COUNT(*) FROM pg_stat_activity WHERE datname = '$DB_DATABASE';" | xargs)
echo "Active connections: $ACTIVE_CONNECTIONS"
if [ "$ACTIVE_CONNECTIONS" -lt 50 ]; then
  echo -e "${GREEN}✓ Connection count is reasonable${NC}"
else
  echo -e "${YELLOW}⚠ High connection count. Consider connection pooling.${NC}"
fi

# Test 8: Database Size
echo ""
echo -e "${YELLOW}Test 8: Database Size${NC}"
DB_SIZE=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_DATABASE" -t -c "SELECT pg_size_pretty(pg_database_size('$DB_DATABASE'));" | xargs)
echo "Database size: $DB_SIZE"

# Summary
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Verification Complete${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Database: $DB_DATABASE"
echo "Host: $DB_HOST:$DB_PORT"
echo "Tables: $TABLE_COUNT"
echo "Indexes: $INDEX_COUNT"
echo "Size: $DB_SIZE"
echo ""

