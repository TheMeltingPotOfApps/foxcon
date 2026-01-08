-- Performance Optimization Indexes Migration
-- This migration adds critical indexes for database performance improvements

-- ============================================================================
-- JOURNEY NODE EXECUTIONS - Composite Indexes for Common Query Patterns
-- ============================================================================

-- Composite index for (nodeId, journeyContactId, tenantId) lookups
-- Used in executeNode method for execution lookups
CREATE INDEX IF NOT EXISTS idx_journey_node_executions_node_contact_tenant 
ON journey_node_executions("nodeId", "journeyContactId", "tenantId");

-- Index on executedAt for sorting recent executions
-- Used in loop detection and previous execution queries
CREATE INDEX IF NOT EXISTS idx_journey_node_executions_executed_at 
ON journey_node_executions("executedAt" DESC) 
WHERE "executedAt" IS NOT NULL;

-- Composite index for (journeyContactId, tenantId, executedAt) queries
-- Used when fetching previous executions
CREATE INDEX IF NOT EXISTS idx_journey_node_executions_contact_tenant_executed 
ON journey_node_executions("journeyContactId", "tenantId", "executedAt" DESC);

-- ============================================================================
-- JOURNEY CONTACTS - Partial Indexes for Active Contacts
-- ============================================================================

-- Partial index for active journey contacts
-- Used in contact count queries (faster than full table scan)
CREATE INDEX IF NOT EXISTS idx_journey_contacts_active 
ON journey_contacts("journeyId", "tenantId", "status") 
WHERE status = 'ACTIVE';

-- Composite index for (journeyId, tenantId, status) queries
CREATE INDEX IF NOT EXISTS idx_journey_contacts_journey_tenant_status 
ON journey_contacts("journeyId", "tenantId", "status");

-- ============================================================================
-- JOURNEY NODES - Indexes for Node Lookups
-- ============================================================================

-- Composite index for (journeyId, id, tenantId) lookups
-- Used in getCachedNode method
CREATE INDEX IF NOT EXISTS idx_journey_nodes_journey_id_tenant 
ON journey_nodes("journeyId", "id", "tenantId");

-- ============================================================================
-- MESSAGES - Indexes for Time-Based Queries
-- ============================================================================

-- Index on createdAt for time-based filtering and pagination
CREATE INDEX IF NOT EXISTS idx_messages_created_at 
ON messages("createdAt" DESC);

-- Composite index for (conversationId, createdAt) queries
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created_at 
ON messages("conversationId", "createdAt" DESC);

-- ============================================================================
-- CALL LOGS - Indexes for Time-Based Queries
-- ============================================================================

-- Index on createdAt for time-based filtering
CREATE INDEX IF NOT EXISTS idx_call_logs_created_at 
ON call_logs("createdAt" DESC);

-- Composite index for (tenantId, createdAt, status) queries
CREATE INDEX IF NOT EXISTS idx_call_logs_tenant_created_status 
ON call_logs("tenantId", "createdAt" DESC, "status");

-- ============================================================================
-- CONTACTS - Additional Indexes for Common Queries
-- ============================================================================

-- Index on createdAt for time-based filtering
CREATE INDEX IF NOT EXISTS idx_contacts_created_at 
ON contacts("createdAt" DESC);

-- Composite index for (tenantId, createdAt) queries
CREATE INDEX IF NOT EXISTS idx_contacts_tenant_created_at 
ON contacts("tenantId", "createdAt" DESC);

-- ============================================================================
-- ANALYZE TABLES - Update Statistics for Query Planner
-- ============================================================================

-- Analyze tables to update query planner statistics
ANALYZE journey_node_executions;
ANALYZE journey_contacts;
ANALYZE journey_nodes;
ANALYZE messages;
ANALYZE call_logs;
ANALYZE contacts;

