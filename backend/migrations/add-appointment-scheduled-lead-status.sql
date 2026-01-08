-- Add APPOINTMENT_SCHEDULED to LeadStatus enum
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'APPOINTMENT_SCHEDULED' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'contacts_leadstatus_enum')
  ) THEN
    ALTER TYPE contacts_leadstatus_enum ADD VALUE 'APPOINTMENT_SCHEDULED';
  END IF;
END $$;

