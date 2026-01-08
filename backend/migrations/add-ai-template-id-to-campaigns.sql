-- Add aiTemplateId column to campaigns table
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS "aiTemplateId" UUID;

-- Add foreign key constraint (optional, if you want referential integrity)
-- ALTER TABLE campaigns 
-- ADD CONSTRAINT "campaigns_aiTemplateId_fkey" 
-- FOREIGN KEY ("aiTemplateId") 
-- REFERENCES ai_templates(id) 
-- ON DELETE SET NULL;

