#!/bin/bash

# Script to check table sizes in PostgreSQL database

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

echo -e "${BLUE}=== Database Table Size Analysis ===${NC}"
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

# Get database size
DB_SIZE=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_DATABASE" -t -c "SELECT pg_size_pretty(pg_database_size('$DB_DATABASE'));" | xargs)
echo -e "${YELLOW}Total Database Size: $DB_SIZE${NC}"
echo ""

# Get table sizes
echo -e "${BLUE}Table Sizes (sorted by size):${NC}"
echo ""

psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_DATABASE" <<EOF
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS indexes_size,
  pg_total_relation_size(schemaname||'.'||tablename) AS total_bytes
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY total_bytes DESC;
EOF

echo ""
echo -e "${BLUE}Top 10 Largest Tables:${NC}"
echo ""

psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_DATABASE" <<EOF
SELECT 
  tablename,
  pg_size_pretty(pg_total_relation_size('public.'||tablename)) AS total_size,
  pg_size_pretty(pg_relation_size('public.'||tablename)) AS table_size,
  pg_size_pretty(pg_total_relation_size('public.'||tablename) - pg_relation_size('public.'||tablename)) AS indexes_size,
  (SELECT n_live_tup FROM pg_stat_user_tables WHERE relname = tablename) AS row_count
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size('public.'||tablename) DESC
LIMIT 10;
EOF

echo ""
echo -e "${BLUE}Table Row Counts:${NC}"
echo ""

psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_DATABASE" <<EOF
SELECT 
  schemaname,
  relname AS table_name,
  n_live_tup AS row_count,
  n_dead_tup AS dead_rows,
  CASE 
    WHEN n_live_tup > 0 THEN ROUND((n_dead_tup::numeric / n_live_tup::numeric) * 100, 2)
    ELSE 0
  END AS dead_row_percentage,
  last_vacuum,
  last_autovacuum,
  last_analyze,
  last_autoanalyze
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC
LIMIT 20;
EOF

echo ""
echo -e "${BLUE}Index Sizes:${NC}"
echo ""

psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_DATABASE" <<EOF
SELECT 
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC
LIMIT 20;
EOF

echo ""
echo -e "${BLUE}Tables That May Need Vacuuming (high dead rows):${NC}"
echo ""

psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_DATABASE" <<EOF
SELECT 
  schemaname,
  relname AS table_name,
  n_live_tup AS live_rows,
  n_dead_tup AS dead_rows,
  CASE 
    WHEN n_live_tup > 0 THEN ROUND((n_dead_tup::numeric / n_live_tup::numeric) * 100, 2)
    ELSE 0
  END AS dead_row_percentage,
  last_vacuum,
  last_autovacuum
FROM pg_stat_user_tables
WHERE n_dead_tup > 1000
  AND (
    CASE 
      WHEN n_live_tup > 0 THEN (n_dead_tup::numeric / n_live_tup::numeric) * 100
      ELSE 0
    END > 10
  )
ORDER BY n_dead_tup DESC;
EOF

echo ""
echo -e "${GREEN}Analysis Complete!${NC}"
echo ""
echo -e "${YELLOW}Recommendations:${NC}"
echo "1. Large tables (>100MB) may benefit from partitioning"
echo "2. Tables with high dead row percentage should be vacuumed"
echo "3. Consider archiving old data from large tables"
echo "4. Review indexes on large tables for optimization"
echo ""

