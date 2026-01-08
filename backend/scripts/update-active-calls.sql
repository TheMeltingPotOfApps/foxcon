-- Update all active calls to completed/failed status
-- This script marks all calls that are still in INITIATED, CONNECTED, or ANSWERED status
-- as COMPLETED (if they have duration > 0) or NO_ANSWER/FAILED (if no duration)

-- First, let's see what we're working with
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

-- Verify the update
SELECT 
  status,
  COUNT(*) as count
FROM call_logs
GROUP BY status
ORDER BY count DESC;
