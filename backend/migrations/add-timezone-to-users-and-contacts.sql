-- Add timezone column to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS timezone VARCHAR(100);

-- Add timezone column to contacts table
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS timezone VARCHAR(100);

-- Add comments
COMMENT ON COLUMN users.timezone IS 'User timezone (e.g., America/New_York, Europe/London)';
COMMENT ON COLUMN contacts.timezone IS 'Contact timezone (e.g., America/New_York, Europe/London)';

-- Create indexes for timezone lookups (optional, but can be useful)
CREATE INDEX IF NOT EXISTS idx_users_timezone ON users(timezone) WHERE timezone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_timezone ON contacts(timezone) WHERE timezone IS NOT NULL;

