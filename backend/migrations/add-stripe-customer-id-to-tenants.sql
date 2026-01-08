-- Add stripeCustomerId column to tenants table if it doesn't exist
-- This is a standalone migration to fix the issue where the column is missing

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'tenants' 
    AND column_name = 'stripeCustomerId'
  ) THEN
    ALTER TABLE tenants ADD COLUMN "stripeCustomerId" VARCHAR(255);
    CREATE INDEX IF NOT EXISTS idx_tenants_stripe_customer ON tenants("stripeCustomerId");
    RAISE NOTICE 'Added stripeCustomerId column to tenants table';
  ELSE
    RAISE NOTICE 'stripeCustomerId column already exists in tenants table';
  END IF;
END $$;

