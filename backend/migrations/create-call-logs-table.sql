-- Migration to create call_logs table for Asterisk call tracking
-- This table stores all call details, events, and metadata

CREATE TABLE IF NOT EXISTS call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL,
  "from" VARCHAR(255) NOT NULL,
  "to" VARCHAR(255) NOT NULL,
  "transferNumber" VARCHAR(255),
  trunk VARCHAR(255),
  context VARCHAR(255) DEFAULT 'DynamicIVR',
  "uniqueId" VARCHAR(255),
  "destinationNumber" VARCHAR(255),
  "callerId" VARCHAR(255),
  "phoneNumber" VARCHAR(255),
  "didUsed" VARCHAR(255),
  status VARCHAR(50) DEFAULT 'initiated' CHECK (status IN ('initiated', 'connected', 'answered', 'failed', 'completed', 'no_answer')),
  "callStatus" VARCHAR(50) DEFAULT 'initiated' CHECK ("callStatus" IN ('initiated', 'connected', 'answered', 'failed', 'completed', 'no_answer')),
  disposition VARCHAR(50) CHECK (disposition IN ('ANSWERED', 'NO_ANSWER', 'BUSY', 'FAILED', 'CANCELLED')),
  duration INTEGER,
  "billableSeconds" INTEGER,
  "callFlowEvents" JSONB,
  metadata JSONB,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_call_logs_tenant FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_call_logs_tenant_id ON call_logs("tenantId");
CREATE INDEX IF NOT EXISTS idx_call_logs_unique_id ON call_logs("uniqueId");
CREATE INDEX IF NOT EXISTS idx_call_logs_to ON call_logs("to");
CREATE INDEX IF NOT EXISTS idx_call_logs_from ON call_logs("from");
CREATE INDEX IF NOT EXISTS idx_call_logs_status ON call_logs(status);
CREATE INDEX IF NOT EXISTS idx_call_logs_created_at ON call_logs("createdAt");
CREATE INDEX IF NOT EXISTS idx_call_logs_tenant_created ON call_logs("tenantId", "createdAt");

-- Add comment to table
COMMENT ON TABLE call_logs IS 'Stores call logs and events from Asterisk AMI integration';
COMMENT ON COLUMN call_logs."uniqueId" IS 'Asterisk unique call identifier';
COMMENT ON COLUMN call_logs."callFlowEvents" IS 'Array of call flow events with timestamps';
COMMENT ON COLUMN call_logs.metadata IS 'Additional call metadata (IVR files, transfer info, etc.)';

