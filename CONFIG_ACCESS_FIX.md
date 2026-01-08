# Config Endpoint Access Fix

## Issue
Getting 403 Forbidden error when accessing `/api/config/ELEVENLABS_API_KEY`

## Root Cause
The config endpoint requires SUPER_ADMIN, ADMIN, or OWNER role. If your user doesn't have one of these roles, you'll get a 403 error.

## Solution

### Option 1: Update Your User Role (Recommended)

If you're the tenant owner, you should have OWNER role. To check and update your role:

1. **Check your current role:**
   ```sql
   SELECT u.email, ut.role, t.name as tenant_name
   FROM users u
   JOIN user_tenants ut ON u.id = ut."userId"
   JOIN tenants t ON ut."tenantId" = t.id
   WHERE u.email = 'your-email@example.com';
   ```

2. **Update to OWNER or ADMIN role:**
   ```sql
   UPDATE user_tenants 
   SET role = 'OWNER' 
   WHERE "userId" = (
     SELECT id FROM users WHERE email = 'your-email@example.com'
   );
   ```

3. **Log out and log back in** to refresh your JWT token with the new role

### Option 2: Use a User with Proper Role

If you have another user account with OWNER, ADMIN, or SUPER_ADMIN role, use that account to update the API keys.

## Allowed Roles

The config endpoint now allows:
- ✅ **SUPER_ADMIN** - System-wide super admin
- ✅ **ADMIN** - Tenant administrator
- ✅ **OWNER** - Tenant owner

## Verification

After updating your role:
1. Log out completely
2. Log back in
3. Try accessing Settings → API Keys again
4. You should now be able to view and update the ElevenLabs API key

## Note

The backend code has been updated to include OWNER role. If you're still getting 403 after updating your role:
1. Make sure you logged out and logged back in (to refresh JWT token)
2. Check that the backend has restarted and picked up the changes
3. Verify your role in the database matches what you expect

