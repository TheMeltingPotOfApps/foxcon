# Marketplace Consolidation Plan

## Overview
This document outlines the plan to consolidate marketplace routes to `/marketplace` prefix only, create separate authentication and user storage for marketplace, while enabling seamless access and data sharing between marketplace and engine.

## Goals

1. **Consolidate Routes**: All marketplace pages use `/marketplace` prefix only
2. **Separate Auth**: Marketplace has its own authentication system
3. **Separate User Storage**: Marketplace users stored separately from engine users
4. **Account Linking**: Users can link marketplace and engine accounts
5. **Data Sharing**: Seamless data sharing between linked accounts

## Architecture

### Database Structure

#### Separate Marketplace Users
- `marketplace_users` - Standalone user table for marketplace
- `marketplace_refresh_tokens` - Refresh tokens for marketplace auth
- `marketplace_sessions` - Session management (optional)

#### Account Linking
- `account_links` - Links engine users to marketplace users
- `data_sharing_permissions` - Controls what data can be shared

#### Marketplace Tenants (Optional)
- `marketplace_tenants` - Marketplace-specific tenants
- `marketplace_user_tenants` - User-tenant relationships

### Authentication Flow

#### Marketplace Authentication
1. User signs up/logs in with marketplace credentials
2. Marketplace auth service validates credentials
3. JWT token issued with marketplace user ID
4. Token stored in marketplace-specific storage

#### Account Linking Flow
1. User logs into marketplace
2. User can link to existing engine account (if email matches or manual link)
3. Link stored in `account_links` table
4. Data sharing permissions configured
5. User can switch between marketplace and engine seamlessly

#### Seamless Access
1. User logged into marketplace can access engine via link
2. User logged into engine can access marketplace via link
3. Single sign-on (SSO) option for linked accounts
4. Context switching without re-authentication

### Data Sharing

#### Shared Resources
- **Contacts**: Marketplace leads can be imported to engine contacts
- **Campaigns**: Engine campaigns can be linked to marketplace listings
- **Journeys**: Marketplace contacts can be added to engine journeys
- **Templates**: Templates can be shared between platforms

#### Sharing Permissions
- Read: View data from other platform
- Write: Create/update data in other platform
- Delete: Remove data from other platform
- Direction: Engine → Marketplace, Marketplace → Engine, or Bidirectional

## Implementation Steps

### Phase 1: Database Migration
1. ✅ Create migration for marketplace auth tables
2. Migrate existing marketplace_users data (if any)
3. Create account linking tables
4. Create data sharing permission tables

### Phase 2: Backend Services
1. Create MarketplaceAuthService
2. Create MarketplaceAuthController
3. Create AccountLinkingService
4. Create DataSharingService
5. Update existing marketplace services to use new auth

### Phase 3: Frontend Consolidation
1. Move all `/nurture-leads` routes to `/marketplace`
2. Remove `(nurture-leads)` route group
3. Update all marketplace pages to use `/marketplace` prefix
4. Create marketplace auth pages (login/signup)
5. Create account linking UI

### Phase 4: Middleware & Routing
1. Update middleware to remove nurture-leads subdomain routing
2. Update route redirects
3. Update API client to use marketplace auth

### Phase 5: Data Sharing Implementation
1. Create contact sync service
2. Create campaign linking UI
3. Create data sharing settings UI
4. Implement bidirectional sync

## Route Consolidation

### Current Routes (to be consolidated)
- `/nurture-leads/*` → `/marketplace/*`
- `/marketplace/*` (already exists, keep)

### Final Routes
All marketplace routes under `/marketplace`:
- `/marketplace` - Marketplace home
- `/marketplace/login` - Marketplace login
- `/marketplace/signup` - Marketplace signup
- `/marketplace/storefront` - Storefront management
- `/marketplace/onboarding` - Marketplace onboarding
- `/marketplace/listings` - Listings list
- `/marketplace/listings/new` - Create new listing
- `/marketplace/listings/[id]` - Listing details
- `/marketplace/listings/[id]/edit` - Edit listing
- `/marketplace/listings/[id]/analytics` - Listing analytics
- `/marketplace/seller` - Seller dashboard
- `/marketplace/buyer` - Buyer dashboard
- `/marketplace/purchases` - Purchases list
- `/marketplace/reservations` - Reservations list
- `/marketplace/reviews` - Reviews page
- `/marketplace/subscriptions` - Subscriptions
- `/marketplace/ingestion` - Lead ingestion
- `/marketplace/ingestion/new` - New ingestion
- `/marketplace/lead-sources` - Lead sources
- `/marketplace/integrations` - Integrations
- `/marketplace/settings` - Marketplace settings
- `/marketplace/account-linking` - Account linking page
- `/marketplace/data-sharing` - Data sharing settings

## API Endpoints

### Marketplace Auth
- `POST /api/marketplace/auth/signup` - Signup
- `POST /api/marketplace/auth/login` - Login
- `POST /api/marketplace/auth/refresh` - Refresh token
- `POST /api/marketplace/auth/logout` - Logout

### Account Linking
- `POST /api/marketplace/account-linking/link` - Link accounts
- `GET /api/marketplace/account-linking/status` - Get link status
- `DELETE /api/marketplace/account-linking/unlink` - Unlink accounts
- `POST /api/marketplace/account-linking/switch` - Switch context

### Data Sharing
- `GET /api/marketplace/data-sharing/permissions` - Get permissions
- `PUT /api/marketplace/data-sharing/permissions` - Update permissions
- `POST /api/marketplace/data-sharing/sync-contacts` - Sync contacts
- `POST /api/marketplace/data-sharing/link-campaign` - Link campaign

## Migration Strategy

### Existing Users
1. Check if user has marketplace profile
2. If yes, create marketplace user account
3. Create account link automatically
4. Migrate data with permissions

### New Users
1. User signs up for marketplace
2. Can optionally link to engine account
3. Data sharing configured on link

## Security Considerations

1. **Separate Auth Tokens**: Marketplace and engine use different token systems
2. **Account Linking Verification**: Verify ownership before linking
3. **Data Sharing Permissions**: Granular control over shared data
4. **Audit Logging**: Log all account linking and data sharing activities
5. **Rate Limiting**: Prevent abuse of linking/unlinking

## Testing Checklist

- [ ] Marketplace signup/login works
- [ ] Account linking works
- [ ] Data sharing permissions work
- [ ] Contact sync works
- [ ] Campaign linking works
- [ ] Context switching works
- [ ] All routes consolidated to `/marketplace`
- [ ] Middleware updated correctly
- [ ] API endpoints work
- [ ] Existing data migrated correctly

## Rollout Plan

1. **Development**: Implement all changes in dev environment
2. **Testing**: Comprehensive testing of all features
3. **Migration**: Run database migrations
4. **Deployment**: Deploy backend changes
5. **Frontend**: Deploy frontend changes
6. **Monitoring**: Monitor for issues
7. **User Communication**: Notify users of changes

