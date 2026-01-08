-- Create voice_presets table
CREATE TABLE IF NOT EXISTS "voice_presets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" varchar NOT NULL,
  "description" varchar,
  "kokoroVoiceId" varchar NOT NULL,
  "kokoroVoiceName" varchar,
  "voiceConfig" jsonb,
  "tags" jsonb DEFAULT '[]'::jsonb,
  "isDefault" boolean DEFAULT false,
  "isActive" boolean DEFAULT true,
  "tenantId" uuid NOT NULL,
  "createdAt" timestamp DEFAULT now(),
  "updatedAt" timestamp DEFAULT now(),
  CONSTRAINT "FK_voice_presets_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "IDX_voice_presets_tenant" ON "voice_presets"("tenantId");
CREATE INDEX IF NOT EXISTS "IDX_voice_presets_is_default" ON "voice_presets"("tenantId", "isDefault") WHERE "isDefault" = true;
CREATE INDEX IF NOT EXISTS "IDX_voice_presets_is_active" ON "voice_presets"("tenantId", "isActive") WHERE "isActive" = true;
