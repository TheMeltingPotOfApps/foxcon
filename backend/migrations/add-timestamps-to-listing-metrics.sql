-- Add createdAt and updatedAt columns to listing_metrics table
-- These columns are required by TypeORM when the entity extends BaseEntity or has @CreateDateColumn/@UpdateDateColumn

ALTER TABLE listing_metrics
ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Update existing rows to have timestamps based on lastUpdated if available
UPDATE listing_metrics
SET "createdAt" = COALESCE("lastUpdated", CURRENT_TIMESTAMP),
    "updatedAt" = COALESCE("lastUpdated", CURRENT_TIMESTAMP)
WHERE "createdAt" IS NULL OR "updatedAt" IS NULL;

-- Create index on createdAt for potential sorting/filtering
CREATE INDEX IF NOT EXISTS idx_listing_metrics_created_at ON listing_metrics("createdAt");

