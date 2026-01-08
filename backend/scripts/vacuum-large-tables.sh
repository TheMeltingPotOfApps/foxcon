#!/bin/bash

# Script to vacuum and optimize large tables

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

echo -e "${BLUE}=== Table Vacuuming and Optimization ===${NC}"
echo ""
echo "Database: $DB_DATABASE"
echo "Host: $DB_HOST:$DB_PORT"
echo ""

# Check connection
if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_DATABASE" -c "SELECT 1;" > /dev/null 2>&1; then
  echo -e "${RED}Error: Cannot connect to database${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Connected to database${NC}"
echo ""

# Tables that need vacuuming (based on analysis)
TABLES_TO_VACUUM=(
  "journey_node_executions"
  "asterisk_dids"
  "tcpa_violations"
  "journeys"
  "lead_ingestion_endpoints"
  "generated_audio"
  "journey_nodes"
  "contacts"
  "call_logs"
)

echo -e "${YELLOW}Starting VACUUM ANALYZE on large tables...${NC}"
echo ""

for table in "${TABLES_TO_VACUUM[@]}"; do
  echo -e "${BLUE}Vacuuming: $table${NC}"
  
  # Check if table exists
  TABLE_EXISTS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_DATABASE" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '$table';" | xargs)
  
  if [ "$TABLE_EXISTS" = "1" ]; then
    # Get row count before
    ROWS_BEFORE=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_DATABASE" -t -c "SELECT n_live_tup FROM pg_stat_user_tables WHERE relname = '$table';" | xargs || echo "0")
    DEAD_ROWS_BEFORE=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_DATABASE" -t -c "SELECT n_dead_tup FROM pg_stat_user_tables WHERE relname = '$table';" | xargs || echo "0")
    
    # Run VACUUM ANALYZE
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_DATABASE" -c "VACUUM ANALYZE \"$table\";" > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
      # Get row count after
      ROWS_AFTER=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_DATABASE" -t -c "SELECT n_live_tup FROM pg_stat_user_tables WHERE relname = '$table';" | xargs || echo "0")
      DEAD_ROWS_AFTER=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_DATABASE" -t -c "SELECT n_dead_tup FROM pg_stat_user_tables WHERE relname = '$table';" | xargs || echo "0")
      
      echo -e "  ${GREEN}✓ Completed${NC} (Dead rows: $DEAD_ROWS_BEFORE → $DEAD_ROWS_AFTER)"
    else
      echo -e "  ${RED}✗ Failed${NC}"
    fi
  else
    echo -e "  ${YELLOW}⚠ Table not found${NC}"
  fi
done

echo ""
echo -e "${YELLOW}Running VACUUM FULL on empty/bloated tables...${NC}"
echo ""

# Tables that are empty but have large size - use VACUUM FULL
EMPTY_BLOATED_TABLES=(
  "asterisk_dids"
  "tcpa_violations"
)

for table in "${EMPTY_BLOATED_TABLES[@]}"; do
  ROW_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_DATABASE" -t -c "SELECT COUNT(*) FROM \"$table\";" | xargs)
  
  if [ "$ROW_COUNT" = "0" ]; then
    echo -e "${BLUE}Running VACUUM FULL on empty table: $table${NC}"
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_DATABASE" -c "VACUUM FULL \"$table\";" > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
      echo -e "  ${GREEN}✓ Completed${NC}"
    else
      echo -e "  ${RED}✗ Failed${NC}"
    fi
  fi
done

echo ""
echo -e "${GREEN}Vacuuming complete!${NC}"
echo ""

# Show updated sizes
echo -e "${BLUE}Updated Table Sizes:${NC}"
echo ""

psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_DATABASE" <<EOF
SELECT 
  tablename,
  pg_size_pretty(pg_total_relation_size('public.'||tablename)) AS total_size,
  pg_size_pretty(pg_relation_size('public.'||tablename)) AS table_size,
  (SELECT n_live_tup FROM pg_stat_user_tables WHERE relname = tablename) AS row_count,
  (SELECT n_dead_tup FROM pg_stat_user_tables WHERE relname = tablename) AS dead_rows
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('journey_node_executions', 'asterisk_dids', 'call_logs', 'tcpa_violations')
ORDER BY pg_total_relation_size('public.'||tablename) DESC;
EOF

echo ""
echo -e "${GREEN}Optimization complete!${NC}"
echo ""

