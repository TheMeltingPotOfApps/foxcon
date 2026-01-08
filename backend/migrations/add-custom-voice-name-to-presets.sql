-- Add customVoiceName column to voice_presets table
ALTER TABLE "voice_presets" 
ADD COLUMN IF NOT EXISTS "customVoiceName" varchar;

-- Add comment to explain the column
COMMENT ON COLUMN "voice_presets"."customVoiceName" IS 'Custom name for the AI agent (used in templates/journeys). If set, this name will be used instead of extracting from kokoroVoiceName.';

