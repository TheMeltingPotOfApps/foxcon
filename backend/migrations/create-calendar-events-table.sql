-- Create calendar_events table with camelCase column names to match TypeORM
CREATE TABLE IF NOT EXISTS "calendar_events" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "title" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "type" VARCHAR(50) NOT NULL DEFAULT 'SALES_CALL',
  "startTime" TIMESTAMP NOT NULL,
  "endTime" TIMESTAMP NOT NULL,
  "attendeeName" VARCHAR(255),
  "attendeeEmail" VARCHAR(255),
  "attendeePhone" VARCHAR(50),
  "attendeeCompany" VARCHAR(255),
  "meetingLink" VARCHAR(500),
  "timezone" VARCHAR(100),
  "status" VARCHAR(50) NOT NULL DEFAULT 'SCHEDULED',
  "assignedToUserId" VARCHAR(255),
  "metadata" JSONB,
  "cancelledAt" TIMESTAMP,
  "cancellationReason" TEXT,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_calendar_events_tenantId" ON "calendar_events"("tenantId");
CREATE INDEX IF NOT EXISTS "idx_calendar_events_assignedToUserId" ON "calendar_events"("assignedToUserId");
CREATE INDEX IF NOT EXISTS "idx_calendar_events_startTime" ON "calendar_events"("startTime");
CREATE INDEX IF NOT EXISTS "idx_calendar_events_status" ON "calendar_events"("status");

