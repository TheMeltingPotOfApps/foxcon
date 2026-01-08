-- Create journey_templates table
CREATE TABLE IF NOT EXISTS journey_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL DEFAULT 'CUSTOM' CHECK (category IN ('LEAD_NURTURE', 'ONBOARDING', 'RETENTION', 'SALES', 'SUPPORT', 'CUSTOM')),
  "isPublic" BOOLEAN DEFAULT false,
  "createdByUserId" UUID,
  "journeyData" JSONB NOT NULL,
  metadata JSONB,
  "usageCount" INTEGER DEFAULT 0,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_journey_templates_tenant ON journey_templates("tenantId");
CREATE INDEX IF NOT EXISTS idx_journey_templates_category ON journey_templates(category);
CREATE INDEX IF NOT EXISTS idx_journey_templates_public ON journey_templates("isPublic");
CREATE INDEX IF NOT EXISTS idx_journey_templates_usage ON journey_templates("usageCount");

