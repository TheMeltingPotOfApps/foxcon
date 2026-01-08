# Super Admin API Documentation

## 🔒 Security

**All endpoints require**:
- `Authorization: Bearer <JWT_TOKEN>` header
- User must have `SUPER_ADMIN` role
- Only ONE super admin account exists (enforced by `SuperAdminGuard`)

**Base URL**: `/api/super-admin`

---

## 📊 Pricing Management (Stripe)

### Get Current Stripe Pricing Configuration
```http
GET /api/super-admin/pricing/stripe
```

**Response**:
```json
{
  "free": {
    "priceId": "price_xxxxx",
    "name": "free",
    "currentPrice": 0,
    "currency": "usd",
    "interval": "month"
  },
  "starter": {
    "priceId": "price_xxxxx",
    "name": "starter",
    "currentPrice": 39.99,
    "currency": "usd",
    "interval": "month"
  },
  ...
}
```

### Create New Stripe Price
```http
POST /api/super-admin/pricing/stripe/create-price
Content-Type: application/json

{
  "planType": "starter",
  "amount": 49.99,
  "currency": "usd",
  "interval": "month"
}
```

**Response**:
```json
{
  "priceId": "price_xxxxx",
  "productId": "prod_xxxxx"
}
```

**Note**: After creating, add `STRIPE_PRICE_STARTER=price_xxxxx` to `.env` and restart backend.

### Update Pricing Configuration
```http
PUT /api/super-admin/pricing/stripe/update
Content-Type: application/json

{
  "planType": "starter",
  "stripePriceId": "price_new_xxxxx"
}
```

**Response**:
```json
{
  "message": "Update .env file: STRIPE_PRICE_STARTER=price_new_xxxxx. Restart backend to apply changes.",
  "priceId": "price_new_xxxxx"
}
```

---

## 🏢 Tenant Management

### Get All Tenants
```http
GET /api/super-admin/tenants
```

**Response**: Array of tenant objects

### Get Tenant Details
```http
GET /api/super-admin/tenants/:id
```

**Response**: Tenant with stats (users, subscriptions, activities, etc.)

### Create Tenant
```http
POST /api/super-admin/tenants
Content-Type: application/json

{
  "name": "New Company",
  "slug": "new-company",
  "timezone": "America/New_York",
  "planType": "starter",
  "ownerEmail": "owner@newcompany.com",
  "ownerPassword": "secure-password"
}
```

**Response**:
```json
{
  "tenant": { ... },
  "owner": { ... } // UserTenant relationship
}
```

### Update Tenant
```http
PUT /api/super-admin/tenants/:id
Content-Type: application/json

{
  "name": "Updated Company Name",
  "isActive": true,
  "timezone": "America/Los_Angeles",
  "billing": {
    "planType": "professional"
  }
}
```

### Delete Tenant (Soft Delete)
```http
DELETE /api/super-admin/tenants/:id
```

**Response**:
```json
{
  "success": true
}
```

### Change Tenant Subscription Plan
```http
POST /api/super-admin/tenants/:id/change-plan
Content-Type: application/json

{
  "planType": "professional",
  "prorate": true
}
```

**Response**: Updated subscription object

**Note**: Requires active Stripe subscription. Updates both Stripe and local database.

---

## 👥 User Management

### Get All Users
```http
GET /api/super-admin/users
```

**Response**: Array of users with their tenant relationships

### Get Users for a Tenant
```http
GET /api/super-admin/tenants/:tenantId/users
```

**Response**: Array of users with roles for that tenant

### Create User
```http
POST /api/super-admin/users
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure-password",
  "firstName": "John",
  "lastName": "Doe",
  "tenantId": "tenant-uuid",
  "role": "MANAGER"
}
```

**Response**:
```json
{
  "user": { ... },
  "userTenant": { ... }
}
```

### Update User
```http
PUT /api/super-admin/users/:id
Content-Type: application/json

{
  "email": "newemail@example.com",
  "firstName": "Jane",
  "lastName": "Smith",
  "isActive": true,
  "timezone": "America/New_York"
}
```

### Delete User (Soft Delete)
```http
DELETE /api/super-admin/users/:id
```

**Response**:
```json
{
  "success": true
}
```

### Change User Role
```http
POST /api/super-admin/users/:id/change-role
Content-Type: application/json

{
  "tenantId": "tenant-uuid",
  "role": "ADMIN"
}
```

**Note**: Cannot assign `SUPER_ADMIN` role via this endpoint.

### Assign User to Tenant
```http
POST /api/super-admin/users/:id/assign-tenant
Content-Type: application/json

{
  "tenantId": "tenant-uuid",
  "role": "VIEWER"
}
```

### Remove User from Tenant
```http
DELETE /api/super-admin/users/:id/tenants/:tenantId
```

**Response**:
```json
{
  "success": true
}
```

**Note**: Cannot remove super admin from tenant.

---

## 📈 Existing Endpoints (Already Implemented)

### System Stats
```http
GET /api/super-admin/stats?startDate=2024-01-01&endDate=2024-12-31
```

### Traffic Analytics
```http
GET /api/super-admin/traffic?startDate=2024-01-01&endDate=2024-12-31
```

### Tenant Activities
```http
GET /api/super-admin/activities?tenantId=xxx&limit=100
```

### Tenant Limits
```http
GET /api/super-admin/tenants/:id/limits
PUT /api/super-admin/tenants/:id/limits
POST /api/super-admin/tenants/:id/limits/plan
```

### Pricing Plans (Database)
```http
GET /api/super-admin/pricing-plans
POST /api/super-admin/pricing-plans
PUT /api/super-admin/pricing-plans/:id
DELETE /api/super-admin/pricing-plans/:id
POST /api/super-admin/pricing-plans/:id/set-default
```

---

## 🔐 Authentication Example

```bash
# Login first to get JWT token
curl -X POST http://localhost:5002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "superadmin@example.com",
    "password": "password"
  }'

# Use token in subsequent requests
curl -X GET http://localhost:5002/api/super-admin/tenants \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## ⚠️ Important Notes

1. **Super Admin Only**: All endpoints require `SUPER_ADMIN` role
2. **Single Super Admin**: Only one super admin account can exist
3. **Internal Use Only**: These endpoints are NOT public-facing
4. **Stripe Changes**: Price updates require `.env` changes and backend restart
5. **Soft Deletes**: Users and tenants are soft-deleted (isActive = false)
6. **Super Admin Protection**: Cannot change/remove super admin role via API

---

## 📝 Common Use Cases

### Change Tenant's Plan
```bash
curl -X POST http://localhost:5002/api/super-admin/tenants/TENANT_ID/change-plan \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"planType": "professional", "prorate": true}'
```

### Create Tenant with Owner
```bash
curl -X POST http://localhost:5002/api/super-admin/tenants \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Company",
    "planType": "starter",
    "ownerEmail": "owner@company.com",
    "ownerPassword": "password123"
  }'
```

### Update Stripe Price
```bash
# 1. Create new price
curl -X POST http://localhost:5002/api/super-admin/pricing/stripe/create-price \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "planType": "starter",
    "amount": 49.99,
    "interval": "month"
  }'

# 2. Update .env with new price ID
# 3. Restart backend
```

---

**Last Updated**: $(date)
**Status**: ✅ Complete - Ready for use

