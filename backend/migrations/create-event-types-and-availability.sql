-- Create event_types table
CREATE TABLE IF NOT EXISTS "event_types" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "durationMinutes" INTEGER,
  "aiTemplateId" UUID,
  "actions" JSONB,
  "reminderSettings" JSONB,
  "isActive" BOOLEAN DEFAULT TRUE,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),
  CONSTRAINT "event_types_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE
);

-- Create availabilities table
CREATE TABLE IF NOT EXISTS "availabilities" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL,
  "eventTypeId" UUID NOT NULL,
  "assignedToUserId" VARCHAR(255),
  "weeklySchedule" JSONB NOT NULL,
  "startDate" DATE,
  "endDate" DATE,
  "blockedDates" JSONB,
  "maxEventsPerSlot" INTEGER,
  "isActive" BOOLEAN DEFAULT TRUE,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),
  CONSTRAINT "availabilities_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "availabilities_eventTypeId_fkey" FOREIGN KEY ("eventTypeId") REFERENCES "event_types"("id") ON DELETE CASCADE
);

-- Add new columns to calendar_events table (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'calendar_events') THEN
    ALTER TABLE "calendar_events" 
      ADD COLUMN IF NOT EXISTS "eventTypeId" UUID,
      ADD COLUMN IF NOT EXISTS "contactId" UUID,
      ADD COLUMN IF NOT EXISTS "journeyId" UUID,
      ADD COLUMN IF NOT EXISTS "reminderSent" JSONB;

    -- Add foreign key constraints
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'calendar_events_eventTypeId_fkey'
    ) THEN
      ALTER TABLE "calendar_events"
        ADD CONSTRAINT "calendar_events_eventTypeId_fkey" FOREIGN KEY ("eventTypeId") REFERENCES "event_types"("id") ON DELETE SET NULL;
    END IF;

    -- Create indexes for calendar_events
    CREATE INDEX IF NOT EXISTS "idx_calendar_events_eventTypeId" ON "calendar_events"("eventTypeId");
    CREATE INDEX IF NOT EXISTS "idx_calendar_events_contactId" ON "calendar_events"("contactId");
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS "idx_event_types_tenantId" ON "event_types"("tenantId");
CREATE INDEX IF NOT EXISTS "idx_event_types_aiTemplateId" ON "event_types"("aiTemplateId");
CREATE INDEX IF NOT EXISTS "idx_availabilities_tenantId" ON "availabilities"("tenantId");
CREATE INDEX IF NOT EXISTS "idx_availabilities_eventTypeId" ON "availabilities"("eventTypeId");

