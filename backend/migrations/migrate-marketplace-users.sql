-- Migration script to handle transition from old marketplace_users to new standalone structure
-- This script renames the old table and creates the new standalone marketplace_users table

-- Step 1: Check if old marketplace_users table exists and rename it
DO $$
BEGIN
  -- Check if old marketplace_users table exists with userId column (old structure)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'marketplace_users' AND column_name = 'userId'
  ) THEN
    -- Rename old table to preserve data
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'marketplace_user_profiles_old') THEN
      ALTER TABLE marketplace_users RENAME TO marketplace_user_profiles_old;
      RAISE NOTICE 'Old marketplace_users table renamed to marketplace_user_profiles_old';
    ELSE
      RAISE NOTICE 'Old marketplace_users table already migrated (marketplace_user_profiles_old exists)';
    END IF;
  END IF;
END $$;

-- Step 2: Create new standalone marketplace_users table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS marketplace_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  avatar_url VARCHAR(500),
  email_verified BOOLEAN DEFAULT false,
  email_verification_token VARCHAR(255),
  password_reset_token VARCHAR(255),
  password_reset_expires TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  timezone VARCHAR(100),
  user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('MARKETER', 'BUYER', 'BOTH')),
  is_verified BOOLEAN DEFAULT false,
  company_name VARCHAR(255),
  storefront_slug VARCHAR(255) UNIQUE,
  storefront_settings JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for new table
CREATE INDEX IF NOT EXISTS idx_marketplace_users_email ON marketplace_users(email);
CREATE INDEX IF NOT EXISTS idx_marketplace_users_storefront_slug ON marketplace_users(storefront_slug) WHERE storefront_slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_marketplace_users_user_type ON marketplace_users(user_type);

-- Step 3: Create other required tables (if they don't exist)
-- Account Links
CREATE TABLE IF NOT EXISTS account_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engine_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  marketplace_user_id UUID NOT NULL REFERENCES marketplace_users(id) ON DELETE CASCADE,
  engine_tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  link_type VARCHAR(20) NOT NULL CHECK (link_type IN ('MANUAL', 'AUTO', 'SSO')),
  is_active BOOLEAN DEFAULT true,
  linked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  linked_by UUID REFERENCES users(id),
  metadata JSONB,
  CONSTRAINT uk_account_links_engine_marketplace UNIQUE (engine_user_id, marketplace_user_id),
  CONSTRAINT uk_account_links_engine_tenant UNIQUE (engine_user_id, engine_tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_account_links_engine_user ON account_links(engine_user_id);
CREATE INDEX IF NOT EXISTS idx_account_links_marketplace_user ON account_links(marketplace_user_id);
CREATE INDEX IF NOT EXISTS idx_account_links_engine_tenant ON account_links(engine_tenant_id);

-- Refresh Tokens
CREATE TABLE IF NOT EXISTS marketplace_refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marketplace_user_id UUID NOT NULL REFERENCES marketplace_users(id) ON DELETE CASCADE,
  token VARCHAR(500) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_used_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_marketplace_refresh_tokens_user ON marketplace_refresh_tokens(marketplace_user_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_refresh_tokens_token ON marketplace_refresh_tokens(token);
CREATE INDEX IF NOT EXISTS idx_marketplace_refresh_tokens_expires ON marketplace_refresh_tokens(expires_at);

-- Sessions
CREATE TABLE IF NOT EXISTS marketplace_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marketplace_user_id UUID NOT NULL REFERENCES marketplace_users(id) ON DELETE CASCADE,
  session_token VARCHAR(500) UNIQUE NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_marketplace_sessions_user ON marketplace_sessions(marketplace_user_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_sessions_token ON marketplace_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_marketplace_sessions_expires ON marketplace_sessions(expires_at);

-- Data Sharing Permissions
CREATE TABLE IF NOT EXISTS data_sharing_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_link_id UUID NOT NULL REFERENCES account_links(id) ON DELETE CASCADE,
  resource_type VARCHAR(50) NOT NULL,
  can_read BOOLEAN DEFAULT false,
  can_write BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  sharing_direction VARCHAR(20) NOT NULL CHECK (sharing_direction IN ('ENGINE_TO_MARKETPLACE', 'MARKETPLACE_TO_ENGINE', 'BIDIRECTIONAL')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uk_data_sharing_permissions_link_resource UNIQUE (account_link_id, resource_type)
);

CREATE INDEX IF NOT EXISTS idx_data_sharing_permissions_link ON data_sharing_permissions(account_link_id);
CREATE INDEX IF NOT EXISTS idx_data_sharing_permissions_resource ON data_sharing_permissions(resource_type);

-- Marketplace Tenants (Optional)
CREATE TABLE IF NOT EXISTS marketplace_tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  settings JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_marketplace_tenants_slug ON marketplace_tenants(slug);

-- Marketplace User Tenants
CREATE TABLE IF NOT EXISTS marketplace_user_tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marketplace_user_id UUID NOT NULL REFERENCES marketplace_users(id) ON DELETE CASCADE,
  marketplace_tenant_id UUID NOT NULL REFERENCES marketplace_tenants(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'MEMBER',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uk_marketplace_user_tenants UNIQUE (marketplace_user_id, marketplace_tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_marketplace_user_tenants_user ON marketplace_user_tenants(marketplace_user_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_user_tenants_tenant ON marketplace_user_tenants(marketplace_tenant_id);

-- Step 4: Optional - Migrate data from old table to new table
-- This would require matching users by email and creating new marketplace users
-- For now, we'll leave the old data in marketplace_user_profiles_old
-- You can migrate it later using application code if needed

DO $$
BEGIN
  RAISE NOTICE 'Migration completed. Old marketplace_users table renamed to marketplace_user_profiles_old if it existed.';
END $$;

