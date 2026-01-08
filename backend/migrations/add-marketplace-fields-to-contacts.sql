-- Migration to add marketplace fields to contacts table
-- This migration adds fields to track which marketplace listing, subscription, and distribution
-- a contact came from, along with metadata about the lead source

ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS "marketplaceListingId" UUID,
ADD COLUMN IF NOT EXISTS "marketplaceSubscriptionId" UUID,
ADD COLUMN IF NOT EXISTS "marketplaceDistributionId" UUID,
ADD COLUMN IF NOT EXISTS "marketplaceMetadata" JSONB;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_contacts_marketplace_listing ON contacts("marketplaceListingId") WHERE "marketplaceListingId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_marketplace_subscription ON contacts("marketplaceSubscriptionId") WHERE "marketplaceSubscriptionId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_marketplace_distribution ON contacts("marketplaceDistributionId") WHERE "marketplaceDistributionId" IS NOT NULL;

