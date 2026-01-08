-- Add voicePresetId to voice_templates table
ALTER TABLE "voice_templates" 
ADD COLUMN IF NOT EXISTS "voicePresetId" uuid;

-- Add foreign key constraint
ALTER TABLE "voice_templates"
ADD CONSTRAINT "FK_voice_templates_voice_preset" 
FOREIGN KEY ("voicePresetId") REFERENCES "voice_presets"("id") ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS "IDX_voice_templates_voice_preset" ON "voice_templates"("voicePresetId");
