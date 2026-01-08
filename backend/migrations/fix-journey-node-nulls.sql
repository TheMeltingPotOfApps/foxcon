-- Fix NULL values in positionX and positionY columns
-- Set them to 0 if they are NULL

UPDATE journey_nodes 
SET "positionX" = 0.0 
WHERE "positionX" IS NULL;

UPDATE journey_nodes 
SET "positionY" = 0.0 
WHERE "positionY" IS NULL;

-- Now make the columns NOT NULL (only if no NULLs remain)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM journey_nodes WHERE "positionX" IS NULL) THEN
    UPDATE journey_nodes SET "positionX" = 0.0 WHERE "positionX" IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM journey_nodes WHERE "positionY" IS NULL) THEN
    UPDATE journey_nodes SET "positionY" = 0.0 WHERE "positionY" IS NULL;
  END IF;
END $$;

ALTER TABLE journey_nodes 
  ALTER COLUMN "positionX" SET NOT NULL,
  ALTER COLUMN "positionY" SET NOT NULL;

