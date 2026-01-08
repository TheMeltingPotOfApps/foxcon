-- Migration to create asterisk_dids table for DID management
-- This table stores Asterisk DIDs (Direct Inward Dialing numbers) imported via CSV

CREATE TABLE IF NOT EXISTS asterisk_dids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL,
  number VARCHAR(255) NOT NULL,
  "areaCode" VARCHAR(10),
  trunk VARCHAR(255) DEFAULT 'PJSIP',
  status VARCHAR(50) DEFAULT 'available' CHECK (status IN ('active', 'available', 'inactive', 'suspended')),
  "usageCount" INTEGER DEFAULT 0,
  "maxUsage" INTEGER,
  "lastUsed" TIMESTAMP,
  metadata JSONB,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_asterisk_dids_tenant FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT unique_tenant_number UNIQUE ("tenantId", number)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_asterisk_dids_tenant_id ON asterisk_dids("tenantId");
CREATE INDEX IF NOT EXISTS idx_asterisk_dids_number ON asterisk_dids(number);
CREATE INDEX IF NOT EXISTS idx_asterisk_dids_status ON asterisk_dids(status);
CREATE INDEX IF NOT EXISTS idx_asterisk_dids_usage_count ON asterisk_dids("usageCount");
CREATE INDEX IF NOT EXISTS idx_asterisk_dids_tenant_status ON asterisk_dids("tenantId", status);

-- Add comment to table
COMMENT ON TABLE asterisk_dids IS 'Stores Asterisk DIDs (Direct Inward Dialing numbers) for call origination';
COMMENT ON COLUMN asterisk_dids.number IS 'Phone number in E.164 format (e.g., +14045556789)';
COMMENT ON COLUMN asterisk_dids."usageCount" IS 'Number of times this DID has been used for calls';
COMMENT ON COLUMN asterisk_dids."maxUsage" IS 'Maximum usage limit (NULL = unlimited)';
COMMENT ON COLUMN asterisk_dids.metadata IS 'Additional DID metadata (provider, cost, region, notes, import info)';

