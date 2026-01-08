-- Migration to create billing_usage table for tracking all billable tenant actions

CREATE TABLE IF NOT EXISTS billing_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL,
  "usageType" VARCHAR(50) NOT NULL CHECK ("usageType" IN (
    'SMS_SENT',
    'SMS_RECEIVED',
    'CALL_MADE',
    'CALL_RECEIVED',
    'CALL_DURATION_SECONDS',
    'AI_MESSAGE_GENERATED',
    'AI_VOICE_GENERATED',
    'AI_TEMPLATE_CREATED',
    'CONTENT_AI_GENERATED',
    'CAMPAIGN_LAUNCHED',
    'JOURNEY_LAUNCHED',
    'CONTACT_CREATED',
    'TEMPLATE_CREATED',
    'WEBHOOK_TRIGGERED',
    'STORAGE_USED_MB',
    'API_REQUEST'
  )),
  quantity DECIMAL(10, 2) NOT NULL DEFAULT 1,
  "stripeSubscriptionItemId" VARCHAR(255),
  "stripeMeterId" VARCHAR(255),
  "billingPeriod" VARCHAR(7), -- Format: YYYY-MM
  "userId" UUID,
  "resourceId" UUID,
  "resourceType" VARCHAR(100),
  metadata JSONB,
  "syncedToStripe" BOOLEAN DEFAULT FALSE,
  "syncedAt" TIMESTAMP,
  "stripeEventId" VARCHAR(255),
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_billing_usage_tenant FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_billing_usage_tenant_created ON billing_usage("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS idx_billing_usage_tenant_type_created ON billing_usage("tenantId", "usageType", "createdAt");
CREATE INDEX IF NOT EXISTS idx_billing_usage_tenant_period ON billing_usage("tenantId", "billingPeriod");
CREATE INDEX IF NOT EXISTS idx_billing_usage_subscription_period ON billing_usage("stripeSubscriptionItemId", "billingPeriod");
CREATE INDEX IF NOT EXISTS idx_billing_usage_synced ON billing_usage("syncedToStripe", "createdAt") WHERE "syncedToStripe" = FALSE;

