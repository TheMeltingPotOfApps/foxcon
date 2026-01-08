-- Create journey_audio table
CREATE TABLE IF NOT EXISTS journey_audio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "contentAiTemplateId" UUID NOT NULL,
  day INTEGER NOT NULL,
  "callNumber" INTEGER NOT NULL,
  "characterIndex" INTEGER,
  "totalCharacters" INTEGER,
  script TEXT NOT NULL,
  "audioUrl" VARCHAR(500) NOT NULL,
  "audioFilePath" VARCHAR(500),
  "fileSizeBytes" BIGINT DEFAULT 0,
  "durationSeconds" DOUBLE PRECISION,
  "usageCount" INTEGER DEFAULT 0,
  metadata JSONB,
  "tenantId" UUID NOT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_journey_audio_template FOREIGN KEY ("contentAiTemplateId") REFERENCES content_ai_templates(id) ON DELETE CASCADE,
  CONSTRAINT fk_journey_audio_tenant FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_journey_audio_template ON journey_audio("contentAiTemplateId");
CREATE INDEX IF NOT EXISTS idx_journey_audio_tenant ON journey_audio("tenantId");
CREATE INDEX IF NOT EXISTS idx_journey_audio_lookup ON journey_audio("contentAiTemplateId", day, "callNumber", "characterIndex", "tenantId");

-- Add comment
COMMENT ON TABLE journey_audio IS 'Stores generated audio files for journey content AI templates';

