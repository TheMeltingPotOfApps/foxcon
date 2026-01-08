-- Add indexes to generated_audio table for performance
-- These indexes are critical for fast lookups when checking for existing audio

-- Index on voiceTemplateId and tenantId (composite index for the WHERE clause)
CREATE INDEX IF NOT EXISTS idx_generated_audio_template_tenant 
ON generated_audio("voiceTemplateId", "tenantId");

-- GIN index on variableValues JSONB column for fast JSONB equality comparisons
CREATE INDEX IF NOT EXISTS idx_generated_audio_variable_values_gin 
ON generated_audio USING GIN ("variableValues");

-- Individual indexes for common lookups
CREATE INDEX IF NOT EXISTS idx_generated_audio_voice_template 
ON generated_audio("voiceTemplateId");

CREATE INDEX IF NOT EXISTS idx_generated_audio_tenant 
ON generated_audio("tenantId");

