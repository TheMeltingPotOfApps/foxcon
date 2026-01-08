-- Comprehensive Database Optimization Migration
-- This migration adds critical indexes, foreign keys, and optimizations for performance

-- ============================================================================
-- JOURNEY NODE EXECUTIONS (Most Critical - Frequently Queried)
-- ============================================================================
-- Indexes for journey_node_executions table
CREATE INDEX IF NOT EXISTS idx_journey_node_executions_journey 
ON journey_node_executions("journeyId");

CREATE INDEX IF NOT EXISTS idx_journey_node_executions_node 
ON journey_node_executions("nodeId");

CREATE INDEX IF NOT EXISTS idx_journey_node_executions_journey_contact 
ON journey_node_executions("journeyContactId");

CREATE INDEX IF NOT EXISTS idx_journey_node_executions_status 
ON journey_node_executions(status);

CREATE INDEX IF NOT EXISTS idx_journey_node_executions_scheduled_at 
ON journey_node_executions("scheduledAt") WHERE "scheduledAt" IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_journey_node_executions_tenant 
ON journey_node_executions("tenantId");

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_journey_node_executions_tenant_status_scheduled 
ON journey_node_executions("tenantId", status, "scheduledAt") 
WHERE status = 'PENDING' AND "scheduledAt" IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_journey_node_executions_journey_contact_status 
ON journey_node_executions("journeyContactId", status);

CREATE INDEX IF NOT EXISTS idx_journey_node_executions_journey_node_status 
ON journey_node_executions("journeyId", "nodeId", status);

-- ============================================================================
-- JOURNEY CONTACTS
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_journey_contacts_journey 
ON journey_contacts("journeyId");

CREATE INDEX IF NOT EXISTS idx_journey_contacts_contact 
ON journey_contacts("contactId");

CREATE INDEX IF NOT EXISTS idx_journey_contacts_status 
ON journey_contacts(status);

CREATE INDEX IF NOT EXISTS idx_journey_contacts_current_node 
ON journey_contacts("currentNodeId") WHERE "currentNodeId" IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_journey_contacts_tenant 
ON journey_contacts("tenantId");

CREATE INDEX IF NOT EXISTS idx_journey_contacts_journey_status 
ON journey_contacts("journeyId", status);

CREATE INDEX IF NOT EXISTS idx_journey_contacts_tenant_status 
ON journey_contacts("tenantId", status);

CREATE INDEX IF NOT EXISTS idx_journey_contacts_enrolled_at 
ON journey_contacts("enrolledAt") WHERE "enrolledAt" IS NOT NULL;

-- ============================================================================
-- JOURNEY NODES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_journey_nodes_journey 
ON journey_nodes("journeyId");

CREATE INDEX IF NOT EXISTS idx_journey_nodes_type 
ON journey_nodes(type);

CREATE INDEX IF NOT EXISTS idx_journey_nodes_tenant 
ON journey_nodes("tenantId");

CREATE INDEX IF NOT EXISTS idx_journey_nodes_journey_type 
ON journey_nodes("journeyId", type);

-- ============================================================================
-- JOURNEYS
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_journeys_status 
ON journeys(status);

CREATE INDEX IF NOT EXISTS idx_journeys_tenant_status 
ON journeys("tenantId", status);

CREATE INDEX IF NOT EXISTS idx_journeys_started_at 
ON journeys("startedAt") WHERE "startedAt" IS NOT NULL;

-- ============================================================================
-- CONTACTS (Critical for Lookups)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_contacts_phone_number 
ON contacts("phoneNumber");

CREATE INDEX IF NOT EXISTS idx_contacts_email 
ON contacts(email) WHERE email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contacts_tenant_phone 
ON contacts("tenantId", "phoneNumber");

CREATE INDEX IF NOT EXISTS idx_contacts_tenant_email 
ON contacts("tenantId", email) WHERE email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contacts_is_opted_out 
ON contacts("isOptedOut") WHERE "isOptedOut" = true;

CREATE INDEX IF NOT EXISTS idx_contacts_lead_status 
ON contacts("leadStatus") WHERE "leadStatus" IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contacts_tenant_opted_out 
ON contacts("tenantId", "isOptedOut");

-- GIN index for JSONB attributes column (for attribute queries)
CREATE INDEX IF NOT EXISTS idx_contacts_attributes_gin 
ON contacts USING GIN (attributes) WHERE attributes IS NOT NULL;

-- ============================================================================
-- MESSAGES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_messages_conversation 
ON messages("conversationId");

CREATE INDEX IF NOT EXISTS idx_messages_direction 
ON messages(direction);

CREATE INDEX IF NOT EXISTS idx_messages_status 
ON messages(status);

CREATE INDEX IF NOT EXISTS idx_messages_tenant 
ON messages("tenantId");

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created 
ON messages("conversationId", "createdAt");

CREATE INDEX IF NOT EXISTS idx_messages_tenant_created 
ON messages("tenantId", "createdAt");

CREATE INDEX IF NOT EXISTS idx_messages_twilio_sid 
ON messages("twilioMessageSid") WHERE "twilioMessageSid" IS NOT NULL;

-- ============================================================================
-- CONVERSATIONS
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_conversations_contact 
ON conversations("contactId");

CREATE INDEX IF NOT EXISTS idx_conversations_status 
ON conversations(status);

CREATE INDEX IF NOT EXISTS idx_conversations_assigned_to 
ON conversations("assignedTo") WHERE "assignedTo" IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_conversations_tenant 
ON conversations("tenantId");

CREATE INDEX IF NOT EXISTS idx_conversations_tenant_status 
ON conversations("tenantId", status);

CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at 
ON conversations("lastMessageAt") WHERE "lastMessageAt" IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_conversations_tenant_last_message 
ON conversations("tenantId", "lastMessageAt") WHERE "lastMessageAt" IS NOT NULL;

-- ============================================================================
-- CALL LOGS (Already has some indexes, but adding more for common queries)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_call_logs_tenant_status 
ON call_logs("tenantId", status);

CREATE INDEX IF NOT EXISTS idx_call_logs_tenant_disposition 
ON call_logs("tenantId", disposition) WHERE disposition IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_call_logs_tenant_created_status 
ON call_logs("tenantId", "createdAt", status);

CREATE INDEX IF NOT EXISTS idx_call_logs_transfer_number 
ON call_logs("transferNumber") WHERE "transferNumber" IS NOT NULL AND "transferNumber" != '';

-- GIN index for metadata JSONB (for transfer status queries)
CREATE INDEX IF NOT EXISTS idx_call_logs_metadata_gin 
ON call_logs USING GIN (metadata) WHERE metadata IS NOT NULL;

-- GIN index for callFlowEvents JSONB
CREATE INDEX IF NOT EXISTS idx_call_logs_call_flow_events_gin 
ON call_logs USING GIN ("callFlowEvents") WHERE "callFlowEvents" IS NOT NULL;

-- ============================================================================
-- VOICE TEMPLATES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_voice_templates_tenant 
ON voice_templates("tenantId");

CREATE INDEX IF NOT EXISTS idx_voice_templates_is_active 
ON voice_templates("isActive") WHERE "isActive" = true;

-- ============================================================================
-- GENERATED AUDIO (Already optimized, but ensuring all indexes exist)
-- ============================================================================
-- These should already exist from previous migration, but ensuring they're there
CREATE INDEX IF NOT EXISTS idx_generated_audio_template_tenant 
ON generated_audio("voiceTemplateId", "tenantId");

CREATE INDEX IF NOT EXISTS idx_generated_audio_variable_values_gin 
ON generated_audio USING GIN ("variableValues");

CREATE INDEX IF NOT EXISTS idx_generated_audio_voice_template 
ON generated_audio("voiceTemplateId");

CREATE INDEX IF NOT EXISTS idx_generated_audio_tenant 
ON generated_audio("tenantId");

-- ============================================================================
-- VOICE MESSAGES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_voice_messages_tenant 
ON voice_messages("tenantId");

CREATE INDEX IF NOT EXISTS idx_voice_messages_campaign 
ON voice_messages("campaignId") WHERE "campaignId" IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_voice_messages_status 
ON voice_messages(status);

CREATE INDEX IF NOT EXISTS idx_voice_messages_tenant_status 
ON voice_messages("tenantId", status);

CREATE INDEX IF NOT EXISTS idx_voice_messages_sent_at 
ON voice_messages("sentAt") WHERE "sentAt" IS NOT NULL;

-- ============================================================================
-- CAMPAIGNS
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_campaigns_tenant 
ON campaigns("tenantId");

CREATE INDEX IF NOT EXISTS idx_campaigns_status 
ON campaigns(status);

CREATE INDEX IF NOT EXISTS idx_campaigns_tenant_status 
ON campaigns("tenantId", status);

-- ============================================================================
-- CAMPAIGN CONTACTS
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_campaign_contacts_campaign 
ON campaign_contacts("campaignId");

CREATE INDEX IF NOT EXISTS idx_campaign_contacts_contact 
ON campaign_contacts("contactId");

CREATE INDEX IF NOT EXISTS idx_campaign_contacts_status 
ON campaign_contacts(status);

CREATE INDEX IF NOT EXISTS idx_campaign_contacts_campaign_contact 
ON campaign_contacts("campaignId", "contactId");

-- ============================================================================
-- TEMPLATES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_templates_tenant 
ON templates("tenantId");

CREATE INDEX IF NOT EXISTS idx_templates_category 
ON templates(category) WHERE category IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_templates_tenant_category 
ON templates("tenantId", category) WHERE category IS NOT NULL;

-- ============================================================================
-- CONTACT TAGS
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_contact_tags_tenant 
ON contact_tags("tenantId");

CREATE INDEX IF NOT EXISTS idx_contact_tags_name 
ON contact_tags(name);

CREATE INDEX IF NOT EXISTS idx_contact_tags_tenant_name 
ON contact_tags("tenantId", name);

-- ============================================================================
-- ANALYZE TABLES (Update statistics for query planner)
-- ============================================================================
ANALYZE journey_node_executions;
ANALYZE journey_contacts;
ANALYZE journey_nodes;
ANALYZE journeys;
ANALYZE contacts;
ANALYZE messages;
ANALYZE conversations;
ANALYZE call_logs;
ANALYZE generated_audio;
ANALYZE voice_messages;
ANALYZE campaigns;

