-- Migration: Add iMessage support to messages table
-- This migration adds messageType enum and imessageId column to support iMessage (Send Blue) functionality
-- Date: 2024-12-14

-- First, create the message_type enum type if it doesn't exist
-- TypeORM uses lowercase enum names, so 'messagetype' matches the MessageType enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'messagetype') THEN
        CREATE TYPE messagetype AS ENUM ('SMS', 'IMESSAGE');
    END IF;
END $$;

-- Add messageType column with default value 'SMS'
-- Handle case where column might already exist (from TypeORM synchronize)
DO $$
BEGIN
    -- Check if column already exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' AND column_name = 'messageType'
    ) THEN
        -- Column exists, check if it's already the correct enum type
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'messages' 
            AND column_name = 'messageType' 
            AND udt_name = 'messagetype'
        ) THEN
            -- Column exists but is wrong type (e.g., VARCHAR), convert it
            -- First, ensure all values are valid enum values
            UPDATE messages SET "messageType" = 'SMS' WHERE "messageType" IS NULL OR "messageType" NOT IN ('SMS', 'IMESSAGE');
            -- Convert to enum type
            ALTER TABLE messages ALTER COLUMN "messageType" TYPE messagetype USING "messageType"::text::messagetype;
            ALTER TABLE messages ALTER COLUMN "messageType" SET DEFAULT 'SMS';
            -- Set NOT NULL constraint if not already set
            ALTER TABLE messages ALTER COLUMN "messageType" SET NOT NULL;
        END IF;
    ELSE
        -- Column doesn't exist, create it
        ALTER TABLE messages ADD COLUMN "messageType" messagetype NOT NULL DEFAULT 'SMS';
    END IF;
END $$;

-- Add imessageId column for tracking iMessage message IDs
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS "imessageId" VARCHAR(255);

-- Create index on messageType for faster filtering
CREATE INDEX IF NOT EXISTS idx_messages_message_type ON messages("messageType");

-- Create index on imessageId for faster lookups (partial index for non-null values)
CREATE INDEX IF NOT EXISTS idx_messages_imessage_id ON messages("imessageId") WHERE "imessageId" IS NOT NULL;

-- Add comments to document the columns
COMMENT ON COLUMN messages."messageType" IS 'Type of message: SMS (via Twilio) or IMESSAGE (via iMessage/Send Blue)';
COMMENT ON COLUMN messages."imessageId" IS 'iMessage message ID or identifier for tracking messages sent via iMessage API';

-- Update existing messages to ensure they all have messageType set to 'SMS' (should already be set due to default, but safe to ensure)
UPDATE messages
SET "messageType" = 'SMS'
WHERE "messageType" IS NULL;
