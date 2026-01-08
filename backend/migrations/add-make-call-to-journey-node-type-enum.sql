-- Add MAKE_CALL to journey_nodes_type_enum
-- First, check if MAKE_CALL already exists, if not add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'MAKE_CALL' 
        AND enumtypid = (
            SELECT oid FROM pg_type WHERE typname = 'journey_nodes_type_enum'
        )
    ) THEN
        ALTER TYPE journey_nodes_type_enum ADD VALUE 'MAKE_CALL';
    END IF;
END $$;

