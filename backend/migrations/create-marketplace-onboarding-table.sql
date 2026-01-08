-- Migration to create marketplace onboarding progress table
-- This table tracks onboarding progress for marketplace users (marketers and buyers)

CREATE TABLE IF NOT EXISTS marketplace_onboarding_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID,
  "userId" UUID NOT NULL,
  "selectedUserType" VARCHAR(20) CHECK ("selectedUserType" IN ('MARKETER', 'BUYER', 'BOTH')),
  "currentStep" VARCHAR(50) NOT NULL DEFAULT 'welcome',
  "completedSteps" JSONB,
  "stepData" JSONB,
  "isCompleted" BOOLEAN NOT NULL DEFAULT false,
  "completedAt" TIMESTAMP,
  "skipped" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_marketplace_onboarding_user FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_marketplace_onboarding_user ON marketplace_onboarding_progress("userId");
CREATE INDEX IF NOT EXISTS idx_marketplace_onboarding_tenant ON marketplace_onboarding_progress("tenantId") WHERE "tenantId" IS NOT NULL;


