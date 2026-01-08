#!/bin/bash

# Script to update all active calls to completed/failed status
# This will mark all calls in INITIATED, CONNECTED, or ANSWERED status as completed/failed

# Load database config from .env if it exists
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_USERNAME=${DB_USERNAME:-sms_user}
DB_PASSWORD=${DB_PASSWORD:-sms_password}
DB_DATABASE=${DB_DATABASE:-sms_platform}

echo "Updating active calls in database: $DB_DATABASE"
echo "Host: $DB_HOST:$DB_PORT"
echo ""

# Export password for psql
export PGPASSWORD=$DB_PASSWORD

# Run the update SQL
psql -h $DB_HOST -p $DB_PORT -U $DB_USERNAME -d $DB_DATABASE << 'SQL'
-- Show current status distribution
SELECT 
  status,
  COUNT(*) as count,
  COUNT(CASE WHEN duration > 0 THEN 1 END) as with_duration,
  COUNT(CASE WHEN disposition IS NOT NULL THEN 1 END) as with_disposition
FROM call_logs
WHERE status IN ('initiated', 'connected', 'answered')
GROUP BY status;

-- Update calls with duration > 0 to COMPLETED (they were answered)
UPDATE call_logs
SET 
  status = 'completed',
  "callStatus" = 'completed',
  disposition = CASE 
    WHEN disposition IS NULL THEN 'ANSWERED'
    ELSE disposition
  END
WHERE status IN ('initiated', 'connected', 'answered')
  AND duration > 0
  AND duration IS NOT NULL;

-- Update calls with no duration or duration = 0 to NO_ANSWER (they weren't answered)
UPDATE call_logs
SET 
  status = 'no_answer',
  "callStatus" = 'no_answer',
  disposition = CASE 
    WHEN disposition IS NULL THEN 'NO_ANSWER'
    ELSE disposition
  END
WHERE status IN ('initiated', 'connected', 'answered')
  AND (duration IS NULL OR duration = 0);

-- Show updated status distribution
SELECT 
  status,
  COUNT(*) as count
FROM call_logs
GROUP BY status
ORDER BY count DESC;
SQL

echo ""
echo "Update complete!"
