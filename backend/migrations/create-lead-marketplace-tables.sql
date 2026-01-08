-- Migration to create all Lead Marketplace tables
-- This migration creates all tables needed for the Lead Marketplace feature
-- All tables follow the tenant isolation pattern with tenantId foreign keys

-- 1. Lead Reservations (Currency System)
CREATE TABLE IF NOT EXISTS lead_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  balance DECIMAL(15, 2) NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_lead_reservations_tenant FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_lead_reservations_user FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT uk_lead_reservations_user_tenant UNIQUE ("userId", "tenantId")
);

CREATE INDEX IF NOT EXISTS idx_lead_reservations_tenant ON lead_reservations("tenantId");
CREATE INDEX IF NOT EXISTS idx_lead_reservations_user ON lead_reservations("userId");

-- 2. Lead Reservation Transactions
CREATE TABLE IF NOT EXISTS lead_reservation_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('PURCHASE', 'SPEND', 'REFUND', 'ADJUSTMENT')),
  amount DECIMAL(15, 2) NOT NULL,
  "listingId" UUID,
  "subscriptionId" UUID,
  metadata JSONB,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_transactions_tenant FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_transactions_user FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_transactions_tenant ON lead_reservation_transactions("tenantId");
CREATE INDEX IF NOT EXISTS idx_transactions_user ON lead_reservation_transactions("userId");
CREATE INDEX IF NOT EXISTS idx_transactions_listing ON lead_reservation_transactions("listingId") WHERE "listingId" IS NOT NULL;

-- 3. Lead Reservation Exchange Rate (Super Admin Only)
CREATE TABLE IF NOT EXISTS lead_reservation_exchange_rate (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rate DECIMAL(10, 4) NOT NULL, -- Lead Reservations per USD
  "effectiveFrom" TIMESTAMP NOT NULL,
  "effectiveTo" TIMESTAMP,
  "createdBy" UUID NOT NULL, -- Super admin user
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Only one active rate at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_exchange_rate_active ON lead_reservation_exchange_rate("effectiveTo") WHERE "effectiveTo" IS NULL;

-- 4. Marketplace Users (Extends UserTenant concept)
CREATE TABLE IF NOT EXISTS marketplace_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "userType" VARCHAR(20) NOT NULL CHECK ("userType" IN ('MARKETER', 'BUYER', 'BOTH')),
  "isVerified" BOOLEAN NOT NULL DEFAULT false,
  "companyName" VARCHAR(255),
  "storefrontSlug" VARCHAR(255) UNIQUE,
  "storefrontSettings" JSONB,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_marketplace_users_tenant FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_marketplace_users_user FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT uk_marketplace_users_user_tenant UNIQUE ("userId", "tenantId")
);

CREATE INDEX IF NOT EXISTS idx_marketplace_users_tenant ON marketplace_users("tenantId");
CREATE INDEX IF NOT EXISTS idx_marketplace_users_slug ON marketplace_users("storefrontSlug") WHERE "storefrontSlug" IS NOT NULL;

-- 5. Listings (Seller's Lead Offerings)
CREATE TABLE IF NOT EXISTS listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL,
  "marketerId" UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  industry VARCHAR(100),
  "pricePerLead" DECIMAL(10, 2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED')),
  "isVerified" BOOLEAN NOT NULL DEFAULT false,
  "leadParameters" JSONB NOT NULL, -- Fields provided per lead
  "weightDistribution" JSONB, -- Distribution rules
  "campaignId" UUID, -- Links to Engine Campaign
  "adsetId" VARCHAR(255),
  "adId" VARCHAR(255),
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_listings_tenant FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_listings_marketer FOREIGN KEY ("marketerId") REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_listings_campaign FOREIGN KEY ("campaignId") REFERENCES campaigns(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_listings_tenant ON listings("tenantId");
CREATE INDEX IF NOT EXISTS idx_listings_marketer ON listings("marketerId");
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings("tenantId", status) WHERE status = 'ACTIVE';
CREATE INDEX IF NOT EXISTS idx_listings_campaign ON listings("campaignId") WHERE "campaignId" IS NOT NULL;

-- 6. Listing Metrics (Public Stats)
CREATE TABLE IF NOT EXISTS listing_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "listingId" UUID NOT NULL,
  "tenantId" UUID NOT NULL,
  "totalLeadsDelivered" INTEGER NOT NULL DEFAULT 0,
  "contactRate" DECIMAL(5, 2) NOT NULL DEFAULT 0, -- Percentage
  "dncRate" DECIMAL(5, 2) NOT NULL DEFAULT 0, -- Percentage
  "soldCount" INTEGER NOT NULL DEFAULT 0,
  "averageDealValue" DECIMAL(10, 2),
  "lastUpdated" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_listing_metrics_listing FOREIGN KEY ("listingId") REFERENCES listings(id) ON DELETE CASCADE,
  CONSTRAINT fk_listing_metrics_tenant FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT uk_listing_metrics_listing UNIQUE ("listingId")
);

CREATE INDEX IF NOT EXISTS idx_listing_metrics_tenant ON listing_metrics("tenantId");

-- 7. Subscriptions (Buyer Subscriptions)
CREATE TABLE IF NOT EXISTS marketplace_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL,
  "buyerId" UUID NOT NULL,
  "listingId" UUID NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PAUSED', 'CANCELLED', 'COMPLETED')),
  "leadCount" INTEGER NOT NULL, -- Total leads requested
  "leadsDelivered" INTEGER NOT NULL DEFAULT 0,
  "leadReservationsSpent" DECIMAL(15, 2) NOT NULL DEFAULT 0,
  priority INTEGER NOT NULL DEFAULT 0, -- Higher = faster distribution
  "startDate" TIMESTAMP NOT NULL,
  "endDate" TIMESTAMP NOT NULL,
  "distributionSchedule" JSONB, -- Rate limiting
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_subscriptions_tenant FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_subscriptions_buyer FOREIGN KEY ("buyerId") REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_subscriptions_listing FOREIGN KEY ("listingId") REFERENCES listings(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant ON marketplace_subscriptions("tenantId");
CREATE INDEX IF NOT EXISTS idx_subscriptions_buyer ON marketplace_subscriptions("buyerId");
CREATE INDEX IF NOT EXISTS idx_subscriptions_listing ON marketplace_subscriptions("listingId");
CREATE INDEX IF NOT EXISTS idx_subscriptions_active ON marketplace_subscriptions("tenantId", "listingId", status, priority) WHERE status = 'ACTIVE';

-- 8. Lead Distributions (Real-time Lead Delivery)
CREATE TABLE IF NOT EXISTS lead_distributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL,
  "listingId" UUID NOT NULL,
  "subscriptionId" UUID NOT NULL,
  "contactId" UUID NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'DELIVERED', 'FAILED', 'REFUNDED')),
  "leadReservationsCharged" DECIMAL(10, 2) NOT NULL,
  "deliveredAt" TIMESTAMP,
  metadata JSONB,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_distributions_tenant FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_distributions_listing FOREIGN KEY ("listingId") REFERENCES listings(id) ON DELETE CASCADE,
  CONSTRAINT fk_distributions_subscription FOREIGN KEY ("subscriptionId") REFERENCES marketplace_subscriptions(id) ON DELETE CASCADE,
  CONSTRAINT fk_distributions_contact FOREIGN KEY ("contactId") REFERENCES contacts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_distributions_tenant ON lead_distributions("tenantId");
CREATE INDEX IF NOT EXISTS idx_distributions_listing ON lead_distributions("listingId");
CREATE INDEX IF NOT EXISTS idx_distributions_subscription ON lead_distributions("subscriptionId");
CREATE INDEX IF NOT EXISTS idx_distributions_contact ON lead_distributions("contactId");
CREATE INDEX IF NOT EXISTS idx_distributions_status ON lead_distributions("tenantId", status) WHERE status = 'PENDING';

-- 9. Listing Reviews
CREATE TABLE IF NOT EXISTS listing_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL,
  "listingId" UUID NOT NULL,
  "buyerId" UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  "isVerifiedPurchase" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_reviews_tenant FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_reviews_listing FOREIGN KEY ("listingId") REFERENCES listings(id) ON DELETE CASCADE,
  CONSTRAINT fk_reviews_buyer FOREIGN KEY ("buyerId") REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_reviews_tenant ON listing_reviews("tenantId");
CREATE INDEX IF NOT EXISTS idx_reviews_listing ON listing_reviews("listingId");
CREATE UNIQUE INDEX IF NOT EXISTS uk_reviews_buyer_listing ON listing_reviews("buyerId", "listingId");

-- 10. Marketing Platform Integrations
CREATE TABLE IF NOT EXISTS marketing_platform_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL,
  "marketerId" UUID NOT NULL,
  platform VARCHAR(50) NOT NULL CHECK (platform IN ('FACEBOOK', 'TIKTOK', 'GOOGLE_ADS', 'CUSTOM')),
  "platformAccountId" VARCHAR(255),
  "accessToken" TEXT, -- Encrypted
  "refreshToken" TEXT, -- Encrypted
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "lastSyncedAt" TIMESTAMP,
  metadata JSONB,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_integrations_tenant FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_integrations_marketer FOREIGN KEY ("marketerId") REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_integrations_tenant ON marketing_platform_integrations("tenantId");
CREATE INDEX IF NOT EXISTS idx_integrations_marketer ON marketing_platform_integrations("marketerId");
CREATE INDEX IF NOT EXISTS idx_integrations_platform ON marketing_platform_integrations("tenantId", platform) WHERE "isActive" = true;

-- 11. Lead Sources (Campaign Tracking)
CREATE TABLE IF NOT EXISTS lead_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL,
  "listingId" UUID NOT NULL,
  platform VARCHAR(50) NOT NULL,
  "campaignId" VARCHAR(255),
  "adsetId" VARCHAR(255),
  "adId" VARCHAR(255),
  brand VARCHAR(255),
  source VARCHAR(255),
  industry VARCHAR(100),
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_lead_sources_tenant FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_lead_sources_listing FOREIGN KEY ("listingId") REFERENCES listings(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_lead_sources_tenant ON lead_sources("tenantId");
CREATE INDEX IF NOT EXISTS idx_lead_sources_listing ON lead_sources("listingId");
CREATE INDEX IF NOT EXISTS idx_lead_sources_campaign ON lead_sources("tenantId", "campaignId", "adsetId", "adId");

-- 12. Custom Endpoints (Extends LeadIngestionEndpoint)
CREATE TABLE IF NOT EXISTS marketplace_custom_endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL,
  "marketerId" UUID NOT NULL,
  "listingId" UUID NOT NULL,
  "endpointKey" VARCHAR(255) UNIQUE NOT NULL,
  "apiKey" VARCHAR(255) NOT NULL,
  "parameterMappings" JSONB NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_custom_endpoints_tenant FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_custom_endpoints_marketer FOREIGN KEY ("marketerId") REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_custom_endpoints_listing FOREIGN KEY ("listingId") REFERENCES listings(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_custom_endpoints_tenant ON marketplace_custom_endpoints("tenantId");
CREATE INDEX IF NOT EXISTS idx_custom_endpoints_listing ON marketplace_custom_endpoints("listingId");
CREATE INDEX IF NOT EXISTS idx_custom_endpoints_key ON marketplace_custom_endpoints("endpointKey");

