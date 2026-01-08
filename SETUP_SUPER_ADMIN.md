# Super Admin Setup Guide

## Important: Only One Super Admin Account

The system is designed to allow **only one super admin account** - exclusively for the app owner. This ensures proper security and control.

## Initial Setup

### Method 1: Using the Setup Endpoint (Recommended for First Time)

If no super admin exists yet, you can create one using the setup endpoint:

```bash
POST /api/setup/create-super-admin
Content-Type: application/json

{
  "email": "owner@example.com",
  "password": "secure-password",
  "firstName": "App",
  "lastName": "Owner",
  "tenantName": "Main Organization"
}
```

**Note:** This endpoint only works if no super admin exists. After the first super admin is created, this endpoint will reject requests.

### Method 2: Direct Database Setup

If you need to set up the super admin manually:

```sql
-- 1. Create or find your user
SELECT id, email FROM users WHERE email = 'owner@example.com';

-- 2. Create or find your tenant
SELECT id, name FROM tenants WHERE name = 'Your Organization Name';

-- 3. Create or update user_tenant with SUPER_ADMIN role
-- IMPORTANT: Only do this if NO super admin exists!
UPDATE user_tenants
SET role = 'SUPER_ADMIN'
WHERE "userId" = '<user-id>' AND "tenantId" = '<tenant-id>';

-- Or create new if doesn't exist:
INSERT INTO user_tenants ("userId", "tenantId", role, "isActive")
VALUES ('<user-id>', '<tenant-id>', 'SUPER_ADMIN', true)
ON CONFLICT DO NOTHING;
```

## Security Features

1. **Single Super Admin Enforcement**: The system prevents multiple super admin accounts
2. **Guard Protection**: All super admin endpoints are protected by `SuperAdminGuard` which:
   - Verifies only one super admin exists
   - Ensures the requesting user is the super admin
   - Blocks access if multiple super admins are detected

3. **Validation**: The system validates that:
   - Only one active super admin exists at any time
   - The super admin role cannot be duplicated
   - Super admin endpoints are exclusive to the app owner

## Accessing Super Admin Portal

Once set up:

1. **Login** with your super admin credentials
2. Navigate to `/super-admin` for the dashboard
3. Navigate to `/super-admin/limits` for limits & pricing management

## Changing Super Admin

If you need to transfer super admin to a different account:

1. The current super admin must first remove their own role (downgrade to OWNER)
2. Then set the new user as super admin (only if no super admin exists)

**Note:** This is a security measure to prevent unauthorized super admin creation.
