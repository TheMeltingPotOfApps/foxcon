-- Execution Rules Table
CREATE TABLE IF NOT EXISTS execution_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID UNIQUE NOT NULL,
  "afterHoursAction" VARCHAR(50) NOT NULL DEFAULT 'RESCHEDULE_NEXT_BUSINESS_DAY',
  "afterHoursRescheduleTime" VARCHAR(5),
  "afterHoursDefaultEventTypeId" UUID,
  "afterHoursBusinessHours" JSONB,
  "tcpaViolationAction" VARCHAR(50) NOT NULL DEFAULT 'BLOCK',
  "tcpaRescheduleTime" VARCHAR(5),
  "tcpaDefaultEventTypeId" UUID,
  "tcpaRescheduleDelayHours" INTEGER,
  "resubmissionAction" VARCHAR(50) NOT NULL DEFAULT 'SKIP_DUPLICATE',
  "resubmissionDetectionWindowHours" INTEGER NOT NULL DEFAULT 24,
  "resubmissionDefaultEventTypeId" UUID,
  "resubmissionRescheduleDelayHours" INTEGER,
  "enableAfterHoursHandling" BOOLEAN NOT NULL DEFAULT true,
  "enableTcpaviolationHandling" BOOLEAN NOT NULL DEFAULT true,
  "enableResubmissionHandling" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "execution_rules_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES tenants("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_execution_rules_tenant ON execution_rules("tenantId");

