-- Add removalCriteria column to journeys table
ALTER TABLE journeys 
ADD COLUMN IF NOT EXISTS "removalCriteria" JSONB;

-- Add comment to explain the column
COMMENT ON COLUMN journeys."removalCriteria" IS 'Configuration for automatically removing contacts from journeys based on conditions (call transferred, call duration, webhook payload, etc.)';

