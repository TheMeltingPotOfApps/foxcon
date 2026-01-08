-- Add audioEffects column to voice_templates table
ALTER TABLE voice_templates 
ADD COLUMN IF NOT EXISTS "audioEffects" JSONB;

-- Add comment
COMMENT ON COLUMN voice_templates."audioEffects" IS 'Audio processing effects: distance, backgroundNoise, volume, coughEffects';
