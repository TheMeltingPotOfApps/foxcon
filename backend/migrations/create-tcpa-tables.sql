-- TCPA Configuration Table
CREATE TABLE IF NOT EXISTS tcpa_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID UNIQUE NOT NULL,
  "complianceMode" VARCHAR(20) NOT NULL DEFAULT 'STRICT',
  "allowedStartHour" INTEGER NOT NULL DEFAULT 8,
  "allowedEndHour" INTEGER NOT NULL DEFAULT 21,
  "allowedDaysOfWeek" TEXT[],
  "requireExpressConsent" BOOLEAN NOT NULL DEFAULT true,
  "requireConsentForAutomated" BOOLEAN NOT NULL DEFAULT true,
  "requireConsentForMarketing" BOOLEAN NOT NULL DEFAULT true,
  "consentExpirationDays" INTEGER,
  "honorOptOuts" BOOLEAN NOT NULL DEFAULT true,
  "honorDncList" BOOLEAN NOT NULL DEFAULT true,
  "autoOptOutOnStop" BOOLEAN NOT NULL DEFAULT true,
  "requireSenderIdentification" BOOLEAN NOT NULL DEFAULT true,
  "requiredSenderName" VARCHAR(255),
  "violationAction" VARCHAR(20) NOT NULL DEFAULT 'BLOCK',
  "logViolations" BOOLEAN NOT NULL DEFAULT true,
  "notifyOnViolation" BOOLEAN NOT NULL DEFAULT true,
  "violationNotificationEmails" TEXT[],
  "blockNonCompliantJourneys" BOOLEAN NOT NULL DEFAULT true,
  "allowManualOverride" BOOLEAN NOT NULL DEFAULT true,
  "overrideReasons" TEXT[],
  "maintainConsentRecords" BOOLEAN NOT NULL DEFAULT true,
  "consentRecordRetentionDays" INTEGER NOT NULL DEFAULT 7,
  "customRules" JSONB,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tcpa_configs_tenant ON tcpa_configs("tenantId");

-- TCPA Violations Table
CREATE TABLE IF NOT EXISTS tcpa_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL,
  "contactId" UUID NOT NULL,
  "violationType" VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'BLOCKED',
  "journeyId" UUID,
  "nodeId" UUID,
  "campaignId" UUID,
  "attemptedAction" VARCHAR(50),
  context JSONB,
  "overriddenBy" UUID,
  "overrideReason" VARCHAR(255),
  "overrideNotes" TEXT,
  "overriddenAt" TIMESTAMP,
  "resolvedAt" TIMESTAMP,
  "resolutionNotes" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tcpa_violations_tenant ON tcpa_violations("tenantId");
CREATE INDEX IF NOT EXISTS idx_tcpa_violations_contact ON tcpa_violations("contactId");
CREATE INDEX IF NOT EXISTS idx_tcpa_violations_journey ON tcpa_violations("journeyId");
CREATE INDEX IF NOT EXISTS idx_tcpa_violations_status ON tcpa_violations(status);
CREATE INDEX IF NOT EXISTS idx_tcpa_violations_created ON tcpa_violations("createdAt");

-- Contact Consents Table
CREATE TABLE IF NOT EXISTS contact_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL,
  "contactId" UUID NOT NULL,
  "consentType" VARCHAR(30) NOT NULL,
  scope VARCHAR(20) NOT NULL DEFAULT 'ALL',
  source TEXT,
  "ipAddress" VARCHAR(45),
  "userAgent" TEXT,
  "consentText" TEXT,
  "expiresAt" TIMESTAMP,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "revokedAt" TIMESTAMP,
  "revocationReason" TEXT,
  metadata JSONB,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_contact_consents_tenant ON contact_consents("tenantId");
CREATE INDEX IF NOT EXISTS idx_contact_consents_contact ON contact_consents("contactId");
CREATE INDEX IF NOT EXISTS idx_contact_consents_active ON contact_consents("isActive", "revokedAt");
CREATE INDEX IF NOT EXISTS idx_contact_consents_expires ON contact_consents("expiresAt");

-- Add foreign key constraints
ALTER TABLE tcpa_configs ADD CONSTRAINT fk_tcpa_configs_tenant FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE tcpa_violations ADD CONSTRAINT fk_tcpa_violations_tenant FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE tcpa_violations ADD CONSTRAINT fk_tcpa_violations_contact FOREIGN KEY ("contactId") REFERENCES contacts(id) ON DELETE CASCADE;
ALTER TABLE contact_consents ADD CONSTRAINT fk_contact_consents_tenant FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE contact_consents ADD CONSTRAINT fk_contact_consents_contact FOREIGN KEY ("contactId") REFERENCES contacts(id) ON DELETE CASCADE;

