-- Add constraint to ensure only one active super admin exists
-- This is enforced at the database level as a safety measure

-- First, create a unique partial index that allows only one SUPER_ADMIN role
CREATE UNIQUE INDEX IF NOT EXISTS "unique_active_super_admin" 
ON user_tenants (role) 
WHERE role = 'SUPER_ADMIN' AND "isActive" = true;

-- Add a comment explaining the constraint
COMMENT ON INDEX "unique_active_super_admin" IS 'Ensures only one active super admin account exists in the system';

