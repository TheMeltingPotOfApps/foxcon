ALTER TABLE segments 
ADD COLUMN IF NOT EXISTS "continuousInclusion" BOOLEAN DEFAULT false;

