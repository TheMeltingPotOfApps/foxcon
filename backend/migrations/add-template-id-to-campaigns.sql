-- Add templateId column to campaigns table
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS "templateId" UUID;

