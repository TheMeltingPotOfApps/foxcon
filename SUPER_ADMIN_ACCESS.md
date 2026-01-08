# Super Admin Access Guide

## How to Access Super Admin Portal

Super admin access is determined by the user's role in the `user_tenants` table. To grant super admin access to a user:

### Method 1: Direct Database Update (Quickest)

1. **Find the user's ID:**
   ```sql
   SELECT id, email FROM users WHERE email = 'your-email@example.com';
   ```

2. **Find the user_tenant relationship:**
   ```sql
   SELECT id, "userId", "tenantId", role FROM user_tenants WHERE "userId" = '<user-id>';
   ```

3. **Update the role to SUPER_ADMIN:**
   ```sql
   UPDATE user_tenants 
   SET role = 'SUPER_ADMIN' 
   WHERE "userId" = '<user-id>';
   ```

### Method 2: Create a Migration Script

Create a SQL migration file to set a specific user as super admin:

```sql
-- Set user as super admin
UPDATE user_tenants 
SET role = 'SUPER_ADMIN' 
WHERE "userId" = (
  SELECT id FROM users WHERE email = 'admin@example.com'
);
```

### Method 3: Via API (if you have super admin access already)

You can create an endpoint or use a script to update user roles programmatically.

## Accessing the Portal

Once a user has the `SUPER_ADMIN` role:

1. **Login** to the application with your credentials
2. **Navigate** to `/super-admin` for the main dashboard
3. **Navigate** to `/super-admin/limits` for managing tenant limits and pricing plans

The super admin navigation items will automatically appear in the sidebar for users with the `SUPER_ADMIN` role.

## Super Admin Features

- **Dashboard** (`/super-admin`): View system-wide stats, traffic analytics, tenant activities
- **Limits & Pricing** (`/super-admin/limits`): 
  - Manage tenant limits (SMS, calls, AI features)
  - Create/edit/delete pricing plans
  - Set default pricing plans
  - Update tenant restrictions

## Verification

To verify a user has super admin access:

```sql
SELECT u.email, ut.role, t.name as tenant_name
FROM users u
JOIN user_tenants ut ON u.id = ut."userId"
JOIN tenants t ON ut."tenantId" = t.id
WHERE ut.role = 'SUPER_ADMIN';
```

## Notes

- Super admin role is set per tenant (in the `user_tenants` table)
- A user can have different roles for different tenants
- Super admin has access to all endpoints regardless of tenant restrictions
- The role is checked during authentication and stored in the JWT token

