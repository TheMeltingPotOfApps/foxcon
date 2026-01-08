#!/bin/bash
# Script to check and manage database connections

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USERNAME="${DB_USERNAME:-sms_user}"
DB_DATABASE="${DB_DATABASE:-sms_platform}"

echo "=== Database Connection Status ==="
echo ""

# Check total connections
echo "Total connections:"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_DATABASE" -c "
SELECT 
  count(*) as total_connections,
  count(*) FILTER (WHERE state = 'active') as active_queries,
  count(*) FILTER (WHERE state = 'idle') as idle_connections,
  count(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction,
  count(*) FILTER (WHERE state = 'idle in transaction (aborted)') as aborted_transactions
FROM pg_stat_activity 
WHERE datname = '$DB_DATABASE';
"

echo ""
echo "=== Connection Details ==="
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_DATABASE" -c "
SELECT 
  pid,
  usename,
  application_name,
  state,
  wait_event_type,
  wait_event,
  query_start,
  state_change,
  LEFT(query, 50) as query_preview
FROM pg_stat_activity 
WHERE datname = '$DB_DATABASE'
ORDER BY state_change DESC
LIMIT 20;
"

echo ""
echo "=== Idle in Transaction Connections (Potential Leaks) ==="
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_DATABASE" -c "
SELECT 
  pid,
  usename,
  application_name,
  state,
  state_change,
  now() - state_change as idle_duration,
  LEFT(query, 100) as query_preview
FROM pg_stat_activity 
WHERE datname = '$DB_DATABASE' 
  AND state = 'idle in transaction'
ORDER BY state_change;
"

echo ""
echo "=== PostgreSQL Max Connections Setting ==="
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_DATABASE" -c "SHOW max_connections;"

echo ""
echo "=== To kill idle in transaction connections (use with caution): ==="
echo "psql -h $DB_HOST -p $DB_PORT -U $DB_USERNAME -d $DB_DATABASE -c \"SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_DATABASE' AND state = 'idle in transaction' AND state_change < now() - interval '5 minutes';\""
