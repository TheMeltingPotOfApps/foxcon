-- Add journeyDescription column to content_ai_templates table
ALTER TABLE content_ai_templates 
ADD COLUMN IF NOT EXISTS journeyDescription TEXT;

-- Add comment to explain the column
COMMENT ON COLUMN content_ai_templates.journeyDescription IS 'Description of the journey content strategy for generating custom audio/IVR scripts (e.g., "15 days, 2-3 calls per day, 3 characters, escalating content")';

