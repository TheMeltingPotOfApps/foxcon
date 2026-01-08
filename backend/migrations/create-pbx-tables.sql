-- Migration to create PBX-related tables
-- This migration creates tables for agent extensions, call queues, call sessions, activity logs, and recordings

-- Create agent_extensions table
CREATE TABLE IF NOT EXISTS agent_extensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  extension VARCHAR(50) NOT NULL,
  "sipUsername" VARCHAR(255) NOT NULL,
  "sipPassword" VARCHAR(255) NOT NULL,
  "sipEndpoint" VARCHAR(255),
  "isActive" BOOLEAN DEFAULT true,
  status VARCHAR(50) DEFAULT 'OFFLINE' CHECK (status IN ('OFFLINE', 'AVAILABLE', 'BUSY', 'AWAY', 'ON_CALL', 'WRAP_UP')),
  "currentCallId" UUID,
  settings JSONB,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_agent_extensions_tenant FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_agent_extensions_user FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT unique_extension_tenant UNIQUE (extension, "tenantId")
);

-- Create call_queues table
CREATE TABLE IF NOT EXISTS call_queues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  "queueNumber" VARCHAR(50) NOT NULL,
  "agentIds" TEXT[] DEFAULT '{}',
  "isActive" BOOLEAN DEFAULT true,
  settings JSONB,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_call_queues_tenant FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT unique_queue_name_tenant UNIQUE (name, "tenantId")
);

-- Create call_sessions table
CREATE TABLE IF NOT EXISTS call_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID,
  "callLogId" UUID NOT NULL,
  "agentId" UUID,
  "contactId" UUID,
  status VARCHAR(50) DEFAULT 'INITIATED' CHECK (status IN ('INITIATED', 'RINGING', 'CONNECTED', 'ON_HOLD', 'TRANSFERRING', 'ENDED')),
  "startedAt" TIMESTAMP,
  "answeredAt" TIMESTAMP,
  "endedAt" TIMESTAMP,
  duration INTEGER,
  metadata JSONB,
  notes TEXT,
  disposition VARCHAR(50) CHECK (disposition IN ('ANSWERED', 'NO_ANSWER', 'BUSY', 'FAILED', 'CANCELLED')),
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_call_sessions_call_log FOREIGN KEY ("callLogId") REFERENCES call_logs(id) ON DELETE CASCADE,
  CONSTRAINT fk_call_sessions_agent FOREIGN KEY ("agentId") REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_call_sessions_contact FOREIGN KEY ("contactId") REFERENCES contacts(id) ON DELETE SET NULL,
  CONSTRAINT fk_call_sessions_tenant FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE
);

-- Create agent_activity_logs table
CREATE TABLE IF NOT EXISTS agent_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL,
  "agentId" UUID NOT NULL,
  "activityType" VARCHAR(50) NOT NULL CHECK ("activityType" IN ('STATUS_CHANGE', 'CALL_STARTED', 'CALL_ENDED', 'LOGIN', 'LOGOUT', 'PAUSE', 'RESUME')),
  metadata JSONB,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_agent_activity_logs_agent FOREIGN KEY ("agentId") REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_agent_activity_logs_tenant FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE
);

-- Create call_recordings table
CREATE TABLE IF NOT EXISTS call_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL,
  "callSessionId" UUID NOT NULL,
  "filePath" VARCHAR(500) NOT NULL,
  duration INTEGER NOT NULL,
  "isDeleted" BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_call_recordings_session FOREIGN KEY ("callSessionId") REFERENCES call_sessions(id) ON DELETE CASCADE,
  CONSTRAINT fk_call_recordings_tenant FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_agent_extensions_tenant ON agent_extensions("tenantId");
CREATE INDEX IF NOT EXISTS idx_agent_extensions_user ON agent_extensions("userId");
CREATE INDEX IF NOT EXISTS idx_agent_extensions_status ON agent_extensions(status);
CREATE INDEX IF NOT EXISTS idx_agent_extensions_tenant_status ON agent_extensions("tenantId", status);

CREATE INDEX IF NOT EXISTS idx_call_queues_tenant ON call_queues("tenantId");
CREATE INDEX IF NOT EXISTS idx_call_queues_active ON call_queues("isActive");

CREATE INDEX IF NOT EXISTS idx_call_sessions_call_log ON call_sessions("callLogId");
CREATE INDEX IF NOT EXISTS idx_call_sessions_agent ON call_sessions("agentId");
CREATE INDEX IF NOT EXISTS idx_call_sessions_status ON call_sessions(status);
CREATE INDEX IF NOT EXISTS idx_call_sessions_tenant_status ON call_sessions("tenantId", status);
CREATE INDEX IF NOT EXISTS idx_call_sessions_created_at ON call_sessions("createdAt");

CREATE INDEX IF NOT EXISTS idx_agent_activity_logs_agent ON agent_activity_logs("agentId");
CREATE INDEX IF NOT EXISTS idx_agent_activity_logs_tenant ON agent_activity_logs("tenantId");
CREATE INDEX IF NOT EXISTS idx_agent_activity_logs_created_at ON agent_activity_logs("createdAt");

CREATE INDEX IF NOT EXISTS idx_call_recordings_session ON call_recordings("callSessionId");
CREATE INDEX IF NOT EXISTS idx_call_recordings_tenant ON call_recordings("tenantId");

-- Add comments
COMMENT ON TABLE agent_extensions IS 'Stores agent SIP extensions and status';
COMMENT ON TABLE call_queues IS 'Stores call queue configurations';
COMMENT ON TABLE call_sessions IS 'Tracks active call sessions between agents and callers';
COMMENT ON TABLE agent_activity_logs IS 'Logs agent activities for reporting and analytics';
COMMENT ON TABLE call_recordings IS 'Stores call recording metadata';

