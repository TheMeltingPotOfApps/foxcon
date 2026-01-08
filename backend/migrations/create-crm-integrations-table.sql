-- Migration to create CRM integrations table
-- This migration creates the table needed for CRM integration configuration

CREATE TABLE IF NOT EXISTS crm_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  marketplace_user_id UUID REFERENCES marketplace_users(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('ENGINE', 'MARKETPLACE')),
  provider VARCHAR(50) NOT NULL CHECK (provider IN ('HUBSPOT', 'SALESFORCE', 'PIPEDRIVE', 'ZOHO', 'ACTIVE_CAMPAIGN', 'MAILCHIMP', 'CUSTOM')),
  name VARCHAR(255),
  api_key TEXT,
  access_token TEXT,
  refresh_token TEXT,
  api_url VARCHAR(500),
  account_id VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  sync_direction VARCHAR(20) DEFAULT 'BIDIRECTIONAL' CHECK (sync_direction IN ('ENGINE_TO_CRM', 'CRM_TO_ENGINE', 'BIDIRECTIONAL')),
  field_mappings JSONB,
  sync_settings JSONB,
  oauth_config JSONB,
  sync_to_linked_account BOOLEAN DEFAULT false,
  linked_account_synced_at TIMESTAMP,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_crm_integrations_tenant_provider ON crm_integrations(tenant_id, provider) WHERE tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_integrations_marketplace_user_provider ON crm_integrations(marketplace_user_id, provider) WHERE marketplace_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_integrations_type ON crm_integrations(type);
CREATE INDEX IF NOT EXISTS idx_crm_integrations_is_active ON crm_integrations(is_active);

-- Add comments
COMMENT ON TABLE crm_integrations IS 'Stores CRM integration configurations for both Engine and Marketplace';
COMMENT ON COLUMN crm_integrations.tenant_id IS 'Tenant ID for Engine integrations';
COMMENT ON COLUMN crm_integrations.marketplace_user_id IS 'Marketplace user ID for Marketplace integrations';
COMMENT ON COLUMN crm_integrations.type IS 'Type of integration: ENGINE or MARKETPLACE';
COMMENT ON COLUMN crm_integrations.sync_to_linked_account IS 'Whether to sync this integration to the linked account';
COMMENT ON COLUMN crm_integrations.field_mappings IS 'Field mappings for contact/lead synchronization';
COMMENT ON COLUMN crm_integrations.sync_settings IS 'Sync configuration (what to sync, auto-sync, etc.)';

