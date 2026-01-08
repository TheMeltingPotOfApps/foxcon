-- Create tenant_limits table
CREATE TABLE IF NOT EXISTS tenant_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL,
  "smsLimit" INTEGER NOT NULL DEFAULT 0,
  "smsUsed" INTEGER NOT NULL DEFAULT 0,
  "callLimit" INTEGER NOT NULL DEFAULT 0,
  "callUsed" INTEGER NOT NULL DEFAULT 0,
  "aiMessageLimit" INTEGER NOT NULL DEFAULT 0,
  "aiMessageUsed" INTEGER NOT NULL DEFAULT 0,
  "aiVoiceLimit" INTEGER NOT NULL DEFAULT 0,
  "aiVoiceUsed" INTEGER NOT NULL DEFAULT 0,
  "aiTemplateLimit" INTEGER NOT NULL DEFAULT 0,
  "aiTemplateUsed" INTEGER NOT NULL DEFAULT 0,
  "contentAiLimit" INTEGER NOT NULL DEFAULT 0,
  "contentAiUsed" INTEGER NOT NULL DEFAULT 0,
  "planType" VARCHAR(50) NOT NULL DEFAULT 'demo',
  "trialEndsAt" TIMESTAMP,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "restrictions" JSONB,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT "tenant_limits_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT "tenant_limits_tenantId_unique" UNIQUE ("tenantId")
);

CREATE INDEX IF NOT EXISTS "idx_tenant_limits_tenantId" ON tenant_limits("tenantId");
CREATE INDEX IF NOT EXISTS "idx_tenant_limits_planType" ON tenant_limits("planType");

-- Create pricing_plans table
CREATE TABLE IF NOT EXISTS pricing_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  "displayName" VARCHAR(255),
  description TEXT,
  "smsLimit" INTEGER NOT NULL DEFAULT 0,
  "callLimit" INTEGER NOT NULL DEFAULT 0,
  "aiMessageLimit" INTEGER NOT NULL DEFAULT 0,
  "aiVoiceLimit" INTEGER NOT NULL DEFAULT 0,
  "aiTemplateLimit" INTEGER NOT NULL DEFAULT 0,
  "contentAiLimit" INTEGER NOT NULL DEFAULT 0,
  restrictions JSONB,
  "monthlyPrice" DECIMAL(10, 2),
  "yearlyPrice" DECIMAL(10, 2),
  "trialDays" INTEGER,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_pricing_plans_name" ON pricing_plans(name);
CREATE INDEX IF NOT EXISTS "idx_pricing_plans_isDefault" ON pricing_plans("isDefault");
CREATE INDEX IF NOT EXISTS "idx_pricing_plans_isActive" ON pricing_plans("isActive");

-- Insert default demo plan
INSERT INTO pricing_plans (name, "displayName", description, "smsLimit", "callLimit", "aiMessageLimit", "aiVoiceLimit", "aiTemplateLimit", "contentAiLimit", restrictions, "isDefault", "sortOrder")
VALUES (
  'demo',
  'Demo Account',
  'Free demo account with limited features',
  5, -- 5 SMS
  2, -- 2 calls
  1, -- 1 AI message
  1, -- 1 AI voice
  1, -- 1 AI template
  1, -- 1 Content AI
  '{"canSendSMS": true, "canMakeCalls": true, "canUseAI": true, "canUseVoiceAI": true, "canUseContentAI": true, "canCreateJourneys": true, "canCreateCampaigns": true, "canUseScheduling": true}'::jsonb,
  true,
  0
) ON CONFLICT (name) DO NOTHING;

