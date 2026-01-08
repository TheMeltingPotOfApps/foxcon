# PBX Separate Authentication Implementation

## Overview

A separate authentication flow and UI has been created for the PBX system, completely independent from the main SMS platform. This allows agents, managers, and supervisors to access the PBX system with a dedicated login experience.

## Structure

### Frontend Routes

```
app/
├── (pbx-auth)/          # PBX Authentication Routes
│   ├── layout.tsx       # PBX auth layout (redirects if authenticated)
│   └── login/
│       └── page.tsx     # PBX login page (extension + password)
│
└── (pbx)/               # PBX Application Routes
    ├── layout.tsx       # PBX app layout (with navigation)
    ├── page.tsx         # PBX root (redirects based on role)
    ├── dashboard/
    │   └── page.tsx     # PBX dashboard
    ├── agent/
    │   └── page.tsx     # Agent portal
    └── manager/
        └── page.tsx     # Manager dashboard
```

### Backend Endpoints

```
POST /api/pbx/auth/login
  Body: { extension: string, password: string }
  Response: {
    accessToken: string,
    user: { id, email, firstName, lastName, role },
    tenantId: string,
    agentExtension: { id, extension, status }
  }
```

## Features

### PBX Login Page (`/pbx/login`)

- **Extension-based login** - Uses extension number instead of email
- **Password authentication** - Uses SIP password from agent extension
- **Role-based redirect** - Automatically redirects to appropriate dashboard:
  - Agents → `/pbx/agent`
  - Managers/Admins → `/pbx/manager`
- **Beautiful UI** - Gradient background, phone icon, modern design
- **Error handling** - Clear error messages for failed logins

### PBX Layout (`(pbx)/layout.tsx`)

- **PBX-specific navigation** - Shows only PBX-related menu items
- **Connection status** - Real-time WebSocket connection indicator
- **Agent extension display** - Shows current agent's extension
- **Role-based menu** - Different navigation for agents vs managers
- **User info** - Displays user name and role
- **Logout** - Redirects to `/pbx/login`

### PBX Dashboard (`/pbx/dashboard`)

- **Welcome header** - Personalized greeting with extension
- **Real-time metrics** - Active calls, waiting calls, available/busy agents
- **Agent status grid** - For managers to see all agents
- **Quick actions** - Links to agent portal and manager dashboard
- **Role-based content** - Different views for agents vs managers

## Authentication Flow

1. **User visits `/pbx/login`**
   - If already authenticated → redirects to `/pbx/dashboard`
   - Shows login form with extension/password fields

2. **User submits credentials**
   - Frontend calls `POST /api/pbx/auth/login`
   - Backend validates extension and SIP password
   - Backend retrieves user role from `user_tenants` table
   - Backend generates JWT token
   - Frontend stores token and user info

3. **Redirect based on role**
   - Agents → `/pbx/agent`
   - Managers/Admins/Owners → `/pbx/manager`
   - Or → `/pbx/dashboard` (shows overview)

4. **Protected routes**
   - All routes under `(pbx)/` require authentication
   - Layout checks auth status and redirects if not authenticated

## Backend Implementation

### PbxAuthController

- **Endpoint**: `POST /api/pbx/auth/login`
- **Validation**: Extension and password required
- **Authentication**:
  1. Find agent extension by extension number
  2. Verify extension is active
  3. Compare password with hashed SIP password
  4. Verify user account is active
  5. Get user role from `user_tenants` table
  6. Generate JWT token
  7. Return token, user info, and agent extension details

### Security

- **Password hashing** - Uses bcrypt (same as SIP passwords)
- **JWT tokens** - Same JWT secret as main app
- **Role validation** - Checks user role from database
- **Active status checks** - Verifies both extension and user are active

## User Experience

### For Agents

1. Navigate to `/pbx/login`
2. Enter extension (e.g., "1001")
3. Enter SIP password
4. Automatically redirected to agent portal
5. See softphone interface, incoming calls, outbound dialing

### For Managers

1. Navigate to `/pbx/login`
2. Enter extension
3. Enter password
4. Automatically redirected to manager dashboard
5. See real-time metrics, agent status, queue monitoring

## Integration Points

### Shared Components

- Uses same UI components (`Card`, `Button`, `Input`, etc.)
- Uses same auth store (`useAuthStore`)
- Uses same API client (`apiClient`)
- Uses same WebSocket hook (`usePbxWebSocket`)

### Separate Features

- Separate login page and flow
- Separate layout and navigation
- Separate dashboard
- PBX-specific authentication endpoint

## Routes Summary

| Route | Description | Auth Required | Role |
|-------|-------------|--------------|------|
| `/pbx/login` | PBX login page | No | Any |
| `/pbx` | PBX root (redirects) | Yes | Any |
| `/pbx/dashboard` | PBX dashboard | Yes | Any |
| `/pbx/agent` | Agent portal | Yes | AGENT |
| `/pbx/manager` | Manager dashboard | Yes | MANAGER/ADMIN/OWNER |

## Next Steps

1. **Test the login flow**
   - Create an agent extension
   - Test login with extension/password
   - Verify role-based redirects

2. **Customize styling**
   - Adjust colors/branding
   - Add company logo
   - Customize gradient backgrounds

3. **Add features**
   - Password reset for PBX
   - Remember extension option
   - Auto-login if already authenticated

4. **Security enhancements**
   - Rate limiting on login endpoint
   - Account lockout after failed attempts
   - Session timeout warnings

## Files Created/Modified

### Backend
- `backend/src/pbx/pbx-auth.controller.ts` - PBX authentication controller
- `backend/src/pbx/pbx.module.ts` - Added PbxAuthController

### Frontend
- `frontend/app/(pbx-auth)/login/page.tsx` - PBX login page
- `frontend/app/(pbx-auth)/layout.tsx` - PBX auth layout
- `frontend/app/(pbx)/layout.tsx` - PBX app layout
- `frontend/app/(pbx)/page.tsx` - PBX root redirect
- `frontend/app/(pbx)/dashboard/page.tsx` - PBX dashboard
- `frontend/app/(pbx)/agent/page.tsx` - Moved from `(app)/pbx/agent`
- `frontend/app/(pbx)/manager/page.tsx` - Moved from `(app)/pbx/manager`

## Testing

To test the PBX authentication:

1. **Create an agent extension** via API or admin panel
2. **Navigate to** `http://localhost:5001/pbx/login`
3. **Enter extension** and SIP password
4. **Verify redirect** to appropriate dashboard
5. **Test logout** and verify redirect back to login

The PBX system now has a completely separate authentication flow and UI!

