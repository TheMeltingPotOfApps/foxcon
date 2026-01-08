#!/bin/bash
# Script to kill idle database connections that are idle in transaction for more than 5 minutes

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USERNAME="${DB_USERNAME:-sms_user}"
DB_DATABASE="${DB_DATABASE:-sms_platform}"
IDLE_MINUTES="${IDLE_MINUTES:-5}"

echo "Killing connections idle in transaction for more than $IDLE_MINUTES minutes..."

psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_DATABASE" <<EOF
SELECT 
  pg_terminate_backend(pid),
  pid,
  usename,
  application_name,
  state_change,
  now() - state_change as idle_duration
FROM pg_stat_activity 
WHERE datname = '$DB_DATABASE' 
  AND state = 'idle in transaction'
  AND state_change < now() - interval '$IDLE_MINUTES minutes';
EOF

echo "Done."
