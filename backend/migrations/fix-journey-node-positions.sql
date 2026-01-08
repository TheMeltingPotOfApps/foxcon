-- Migration to fix positionX and positionY columns from integer to float
-- This allows ReactFlow coordinates (which can be decimals) to be stored properly

ALTER TABLE journey_nodes 
  ALTER COLUMN "positionX" TYPE DOUBLE PRECISION USING "positionX"::DOUBLE PRECISION,
  ALTER COLUMN "positionY" TYPE DOUBLE PRECISION USING "positionY"::DOUBLE PRECISION;

