-- Add maxEventsPerSlot column to availabilities table
ALTER TABLE "availabilities" 
  ADD COLUMN IF NOT EXISTS "maxEventsPerSlot" INTEGER;

