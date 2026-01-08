-- Create contact_visits table
CREATE TABLE IF NOT EXISTS "contact_visits" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "contactId" UUID NOT NULL REFERENCES "contacts"("id") ON DELETE CASCADE,
  "eventTypeId" UUID REFERENCES "event_types"("id") ON DELETE SET NULL,
  "ipAddress" VARCHAR(255),
  "userAgent" TEXT,
  "referrer" VARCHAR(500),
  "metadata" JSONB,
  "scheduledEventAt" TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_contact_visits_contactId" ON "contact_visits"("contactId");
CREATE INDEX IF NOT EXISTS "idx_contact_visits_eventTypeId" ON "contact_visits"("eventTypeId");
CREATE INDEX IF NOT EXISTS "idx_contact_visits_tenantId" ON "contact_visits"("tenantId");
CREATE INDEX IF NOT EXISTS "idx_contact_visits_createdAt" ON "contact_visits"("createdAt");

