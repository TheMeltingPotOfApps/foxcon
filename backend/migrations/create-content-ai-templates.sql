-- Create content_ai_templates table
CREATE TABLE IF NOT EXISTS content_ai_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  "exampleMessages" JSONB NOT NULL,
  "generatedVariations" JSONB,
  creativity DOUBLE PRECISION DEFAULT 0.7,
  "unique" BOOLEAN DEFAULT false,
  config JSONB,
  "isActive" BOOLEAN DEFAULT true,
  "lastUsedAt" TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_content_ai_templates_tenant FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE
);

-- Create index on tenantId for faster queries
CREATE INDEX IF NOT EXISTS idx_content_ai_templates_tenant ON content_ai_templates("tenantId");

-- Create index on isActive for filtering
CREATE INDEX IF NOT EXISTS idx_content_ai_templates_active ON content_ai_templates("isActive");

