-- Migration to create billing-related tables
-- This migration creates tables for subscriptions, invoices, and payment methods

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL,
  "stripeSubscriptionId" VARCHAR(255) UNIQUE NOT NULL,
  "stripeCustomerId" VARCHAR(255),
  "planType" VARCHAR(50) NOT NULL DEFAULT 'free' CHECK ("planType" IN ('free', 'starter', 'professional', 'enterprise')),
  status VARCHAR(50) NOT NULL DEFAULT 'trialing' CHECK (status IN ('active', 'canceled', 'past_due', 'unpaid', 'trialing', 'incomplete', 'incomplete_expired')),
  "stripePriceId" VARCHAR(255),
  "currentPeriodStart" TIMESTAMP,
  "currentPeriodEnd" TIMESTAMP,
  "cancelAtPeriodEnd" BOOLEAN,
  "canceledAt" TIMESTAMP,
  metadata JSONB,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_subscriptions_tenant FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE
);

-- Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL,
  "stripeInvoiceId" VARCHAR(255) UNIQUE NOT NULL,
  "stripeCustomerId" VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'paid', 'uncollectible', 'void')),
  amount DECIMAL(10, 2) NOT NULL,
  "amountPaid" DECIMAL(10, 2),
  currency VARCHAR(10),
  "invoicePdf" TEXT,
  "hostedInvoiceUrl" TEXT,
  "dueDate" TIMESTAMP,
  "paidAt" TIMESTAMP,
  "lineItems" JSONB,
  metadata JSONB,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_invoices_tenant FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE
);

-- Create payment_methods table
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL,
  "stripePaymentMethodId" VARCHAR(255) UNIQUE NOT NULL,
  "stripeCustomerId" VARCHAR(255),
  type VARCHAR(50) NOT NULL DEFAULT 'card' CHECK (type IN ('card', 'us_bank_account')),
  "isDefault" BOOLEAN DEFAULT false,
  "cardDetails" JSONB,
  metadata JSONB,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_payment_methods_tenant FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE
);

-- Add billing columns to tenants table if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tenants' AND column_name='stripeCustomerId') THEN
    ALTER TABLE tenants ADD COLUMN "stripeCustomerId" VARCHAR(255);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tenants' AND column_name='billing') THEN
    ALTER TABLE tenants ADD COLUMN billing JSONB;
  END IF;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant ON subscriptions("tenantId");
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON subscriptions("stripeCustomerId");
CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON invoices("tenantId");
CREATE INDEX IF NOT EXISTS idx_invoices_stripe_customer ON invoices("stripeCustomerId");
CREATE INDEX IF NOT EXISTS idx_payment_methods_tenant ON payment_methods("tenantId");
CREATE INDEX IF NOT EXISTS idx_payment_methods_stripe_customer ON payment_methods("stripeCustomerId");
CREATE INDEX IF NOT EXISTS idx_tenants_stripe_customer ON tenants("stripeCustomerId");

