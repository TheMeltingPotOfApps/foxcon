-- Add UPDATE_CONTACT_STATUS to journey_nodes_type_enum
-- This migration adds the UPDATE_CONTACT_STATUS value to the existing enum type

DO $$ 
BEGIN
    -- Check if the enum value already exists before adding it
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_enum 
        WHERE enumlabel = 'UPDATE_CONTACT_STATUS' 
        AND enumtypid = (
            SELECT oid 
            FROM pg_type 
            WHERE typname = 'journey_nodes_type_enum'
        )
    ) THEN
        ALTER TYPE journey_nodes_type_enum ADD VALUE 'UPDATE_CONTACT_STATUS';
    END IF;
END $$;

