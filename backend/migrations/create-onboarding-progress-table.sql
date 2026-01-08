-- Create onboarding_progress table
CREATE TABLE IF NOT EXISTS onboarding_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "currentStep" VARCHAR(50) NOT NULL DEFAULT 'welcome',
  "completedSteps" JSONB,
  "stepData" JSONB,
  "isCompleted" BOOLEAN NOT NULL DEFAULT false,
  "completedAt" TIMESTAMP,
  "skipped" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT "onboarding_progress_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT "onboarding_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT "onboarding_progress_tenant_user_unique" UNIQUE ("tenantId", "userId")
);

CREATE INDEX IF NOT EXISTS "idx_onboarding_progress_tenantId" ON onboarding_progress("tenantId");
CREATE INDEX IF NOT EXISTS "idx_onboarding_progress_userId" ON onboarding_progress("userId");

