-- Create tenant_lead_statuses table
CREATE TABLE IF NOT EXISTS "tenant_lead_statuses" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "color" VARCHAR(7),
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "isSystem" BOOLEAN NOT NULL DEFAULT false,
  "metadata" JSONB,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tenant_lead_statuses_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE
);

-- Create unique index on tenantId and name
CREATE UNIQUE INDEX IF NOT EXISTS "idx_tenant_lead_statuses_tenant_name" ON "tenant_lead_statuses"("tenantId", "name");

-- Create index on tenantId and isActive for filtering
CREATE INDEX IF NOT EXISTS "idx_tenant_lead_statuses_tenant_active" ON "tenant_lead_statuses"("tenantId", "isActive");

-- Create index on displayOrder for sorting
CREATE INDEX IF NOT EXISTS "idx_tenant_lead_statuses_display_order" ON "tenant_lead_statuses"("tenantId", "displayOrder");

-- Create status_automations table
CREATE TABLE IF NOT EXISTS "status_automations" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "triggerType" VARCHAR(50) NOT NULL DEFAULT 'TIME_BASED',
  "fromStatusId" UUID,
  "timeValue" INTEGER,
  "timeUnit" VARCHAR(20),
  "triggerStatusId" UUID,
  "targetStatusId" UUID NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "conditions" JSONB,
  "metadata" JSONB,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "status_automations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "status_automations_fromStatusId_fkey" FOREIGN KEY ("fromStatusId") REFERENCES "tenant_lead_statuses"("id") ON DELETE SET NULL,
  CONSTRAINT "status_automations_triggerStatusId_fkey" FOREIGN KEY ("triggerStatusId") REFERENCES "tenant_lead_statuses"("id") ON DELETE SET NULL,
  CONSTRAINT "status_automations_targetStatusId_fkey" FOREIGN KEY ("targetStatusId") REFERENCES "tenant_lead_statuses"("id") ON DELETE RESTRICT
);

-- Create indexes for status_automations
CREATE INDEX IF NOT EXISTS "idx_status_automations_tenant_active" ON "status_automations"("tenantId", "isActive");
CREATE INDEX IF NOT EXISTS "idx_status_automations_from_status" ON "status_automations"("fromStatusId");
CREATE INDEX IF NOT EXISTS "idx_status_automations_trigger_status" ON "status_automations"("triggerStatusId");
CREATE INDEX IF NOT EXISTS "idx_status_automations_target_status" ON "status_automations"("targetStatusId");

