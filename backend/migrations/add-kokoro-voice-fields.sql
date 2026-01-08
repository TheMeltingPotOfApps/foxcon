-- Migration: Add Kokoro voice fields to voice_templates table
-- This migration adds kokoroVoiceId and kokoroVoiceName columns while keeping
-- the existing elevenLabsVoiceId and elevenLabsVoiceName columns for backward compatibility

-- Add new Kokoro voice columns
ALTER TABLE voice_templates
ADD COLUMN IF NOT EXISTS "kokoroVoiceId" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "kokoroVoiceName" VARCHAR(255);

-- Migrate existing data: Copy from elevenLabsVoiceId to kokoroVoiceId if kokoroVoiceId is null
-- Note: This assumes existing voice IDs are compatible with Kokoro API
UPDATE voice_templates
SET "kokoroVoiceId" = "elevenLabsVoiceId",
    "kokoroVoiceName" = "elevenLabsVoiceName"
WHERE "kokoroVoiceId" IS NULL 
  AND "elevenLabsVoiceId" IS NOT NULL;

-- Add comment to document the migration
COMMENT ON COLUMN voice_templates."kokoroVoiceId" IS 'Kokoro TTS voice ID (replaces elevenLabsVoiceId)';
COMMENT ON COLUMN voice_templates."kokoroVoiceName" IS 'Kokoro TTS voice name (replaces elevenLabsVoiceName)';
