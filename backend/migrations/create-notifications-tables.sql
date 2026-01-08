-- Create notifications table
CREATE TABLE IF NOT EXISTS "notifications" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "type" VARCHAR(50) NOT NULL,
  "title" VARCHAR(255) NOT NULL,
  "message" TEXT,
  "status" VARCHAR(20) NOT NULL DEFAULT 'UNREAD',
  "metadata" JSONB,
  "readAt" TIMESTAMP,
  "archivedAt" TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),
  CONSTRAINT "notifications_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE
);

-- Create notification_preferences table
CREATE TABLE IF NOT EXISTS "notification_preferences" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "campaignId" UUID,
  "journeyId" UUID,
  "conversationId" UUID,
  "smsReplyEnabled" BOOLEAN DEFAULT TRUE,
  "campaignReplyEnabled" BOOLEAN DEFAULT FALSE,
  "journeyReplyEnabled" BOOLEAN DEFAULT FALSE,
  "conversationMessageEnabled" BOOLEAN DEFAULT FALSE,
  "campaignCompletedEnabled" BOOLEAN DEFAULT FALSE,
  "journeyCompletedEnabled" BOOLEAN DEFAULT FALSE,
  "channels" JSONB DEFAULT '{"channels": ["IN_APP"]}',
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),
  CONSTRAINT "notification_preferences_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "notification_preferences_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE,
  CONSTRAINT "notification_preferences_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "journeys"("id") ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "idx_notifications_userId" ON "notifications"("userId");
CREATE INDEX IF NOT EXISTS "idx_notifications_status" ON "notifications"("status");
CREATE INDEX IF NOT EXISTS "idx_notifications_type" ON "notifications"("type");
CREATE INDEX IF NOT EXISTS "idx_notifications_tenantId" ON "notifications"("tenantId");
CREATE INDEX IF NOT EXISTS "idx_notification_preferences_userId" ON "notification_preferences"("userId");
CREATE INDEX IF NOT EXISTS "idx_notification_preferences_campaignId" ON "notification_preferences"("campaignId");
CREATE INDEX IF NOT EXISTS "idx_notification_preferences_journeyId" ON "notification_preferences"("journeyId");
CREATE INDEX IF NOT EXISTS "idx_notification_preferences_tenantId" ON "notification_preferences"("tenantId");

