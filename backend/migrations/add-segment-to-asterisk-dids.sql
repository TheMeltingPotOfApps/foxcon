-- Migration to add segment/group field to asterisk_dids table
-- This allows DIDs to be organized into segments for easier selection in journeys

ALTER TABLE "asterisk_dids" 
ADD COLUMN IF NOT EXISTS "segment" VARCHAR(255);

-- Create index for segment queries
CREATE INDEX IF NOT EXISTS "idx_asterisk_dids_segment" ON "asterisk_dids"("tenantId", "segment");

-- Add comment
COMMENT ON COLUMN "asterisk_dids"."segment" IS 'Segment/group name for organizing DIDs (e.g., "twilio-main", "twilio-backup", "provider-a")';

-- Update existing DIDs to have a default segment if they're Twilio numbers
-- This will be handled by the import script, but we set a default for existing records
UPDATE "asterisk_dids" 
SET "segment" = 'default' 
WHERE "segment" IS NULL;

