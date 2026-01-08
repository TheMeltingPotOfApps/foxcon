# Stripe Billing System - Completion Checklist

## 🔍 Current Status Review

### ✅ What's Already Implemented

1. **Backend Code** ✅
   - `BillingService` - Complete Stripe integration
   - `BillingUsageService` - Usage tracking system
   - `BillingController` - All API endpoints
   - `BillingWebhookController` - Webhook handler
   - Database entities (Subscription, Invoice, PaymentMethod, BillingUsage)
   - Usage tracking integrated in TwilioService

2. **Database Schema** ✅
   - Migration SQL files created
   - Entity definitions complete

3. **Stripe Configuration** ⚠️ **PARTIAL**
   - ✅ Stripe secret key added to `.env`
   - ❌ Stripe products/prices NOT created yet
   - ❌ Stripe price IDs NOT in `.env`
   - ❌ Webhook secret NOT configured

---

## 📋 REQUIRED STEPS TO COMPLETE

### 🔴 CRITICAL - Must Complete for Basic Functionality

#### 1. Run Database Migration ⚠️ **NOT DONE**

**Status**: Migration script exists but table may not be created

**Action Required**:
```bash
cd /root/SMS/backend
node scripts/run-billing-usage-migration.js
```

**Verify**:
```bash
# Check if table exists
psql -h localhost -p 5433 -U sms_user -d sms_platform -c "\d billing_usage"
```

**Expected Result**: Table `billing_usage` should exist with all columns

---

#### 2. Create Stripe Products and Prices ⚠️ **NOT DONE**

**Status**: Script exists but products not created in Stripe

**Action Required**:
```bash
cd /root/SMS/backend
npx ts-node scripts/setup-stripe-products.ts
```

**What This Does**:
- Creates 4 products in Stripe: Free, Starter, Professional, Enterprise
- Creates monthly prices for each
- Creates yearly prices (optional)
- Outputs price IDs to console

**After Running**, add output to `.env`:
```env
# Stripe Price IDs (Monthly) - REQUIRED
STRIPE_PRICE_FREE=price_xxxxx
STRIPE_PRICE_STARTER=price_xxxxx
STRIPE_PRICE_PROFESSIONAL=price_xxxxx
STRIPE_PRICE_ENTERPRISE=price_xxxxx

# Stripe Price IDs (Yearly) - Optional
STRIPE_PRICE_FREE_YEARLY=price_xxxxx
STRIPE_PRICE_STARTER_YEARLY=price_xxxxx
STRIPE_PRICE_PROFESSIONAL_YEARLY=price_xxxxx
STRIPE_PRICE_ENTERPRISE_YEARLY=price_xxxxx
```

**⚠️ IMPORTANT**: Without these price IDs, checkout sessions will fail!

---

#### 3. Configure Stripe Webhook ⚠️ **NOT DONE**

**Status**: Webhook endpoint exists but not configured in Stripe Dashboard

**Action Required**:

1. **Get your webhook URL**:
   - Production: `https://your-domain.com/api/billing/webhook`
   - Development: Use ngrok or similar: `https://your-ngrok-url.ngrok.io/api/billing/webhook`

2. **In Stripe Dashboard**:
   - Go to: https://dashboard.stripe.com/webhooks
   - Click "Add endpoint"
   - Paste your webhook URL
   - Select these events:
     ```
     customer.subscription.created
     customer.subscription.updated
     customer.subscription.deleted
     invoice.created
     invoice.finalized
     invoice.paid
     invoice.payment_failed
     invoice.payment_action_required
     invoice.upcoming
     payment_method.attached
     payment_method.detached
     customer.updated
     checkout.session.completed
     ```

3. **Copy Webhook Secret**:
   - After creating webhook, click "Reveal" on the signing secret
   - Add to `.env`:
     ```env
     STRIPE_WEBHOOK_SECRET=whsec_xxxxx
     ```

**⚠️ CRITICAL**: Without webhook secret, webhook verification will fail!

---

### 🟡 IMPORTANT - For Full Functionality

#### 4. Complete Usage Tracking Integration ⚠️ **PARTIAL**

**Current Status**:
- ✅ TwilioService - SMS and calls tracked
- ❌ CampaignsService - NOT integrated
- ❌ JourneysService - NOT integrated
- ❌ ConversationsService - Uses tenant limits, not billing usage
- ❌ Other services - NOT integrated

**Action Required**:

**A. Integrate CampaignsService**:
```typescript
// In campaigns.service.ts, after campaign launch:
await this.billingUsageService.trackUsage({
  tenantId,
  usageType: BillingUsageType.CAMPAIGN_LAUNCHED,
  resourceId: campaign.id,
  resourceType: 'campaign',
  metadata: { campaignId: campaign.id },
});
```

**B. Integrate JourneysService**:
```typescript
// In journeys.service.ts, after journey launch:
await this.billingUsageService.trackUsage({
  tenantId,
  usageType: BillingUsageType.JOURNEY_LAUNCHED,
  resourceId: journey.id,
  resourceType: 'journey',
  metadata: { journeyId: journey.id },
});
```

**C. Integrate Other Services**:
- AI message generation
- AI voice generation
- Contact creation
- Template creation
- Webhook triggers

**Note**: Make sure `BillingModule` is imported in each service's module.

---

#### 5. Fix Tenant Email in Customer Creation ⚠️ **NEEDS IMPROVEMENT**

**Current Issue**: Line 69 in `billing.service.ts`:
```typescript
email: tenant.name, // You might want to use a contact email instead
```

**Action Required**:
- Add `contactEmail` field to Tenant entity OR
- Use a user's email from the tenant OR
- Update to use proper email field

**Impact**: Stripe customer emails will be incorrect

---

#### 6. Add TenantGuard to Availability Controller ⚠️ **MISSING**

**Current Issue**: `availability.controller.ts` uses `@UseGuards(JwtAuthGuard)` but not `TenantGuard`

**Action Required**:
```typescript
@UseGuards(JwtAuthGuard, TenantGuard) // Add TenantGuard
```

**Impact**: Security issue - tenants could access other tenants' data

---

### 🟢 OPTIONAL - For Advanced Features

#### 7. Implement Stripe Meter Sync (Usage-Based Billing) ⚠️ **NOT IMPLEMENTED**

**Status**: Code exists but Stripe API call is commented out

**Action Required**:
1. Create billing meters in Stripe Dashboard
2. Add meter IDs to `.env`:
   ```env
   STRIPE_METER_SMS_SENT=mtr_xxxxx
   STRIPE_METER_CALL_DURATION=mtr_xxxxx
   STRIPE_METER_AI_MESSAGE=mtr_xxxxx
   STRIPE_METER_AI_VOICE=mtr_xxxxx
   ```
3. Implement correct Stripe API call in `billing-usage.service.ts` (line ~142)
4. Set up cron job to sync usage daily

**Note**: This is optional - you can use flat-rate subscriptions without usage-based billing.

---

#### 8. Frontend Integration ⚠️ **NOT VERIFIED**

**Check if frontend has**:
- Billing settings page
- Checkout flow
- Subscription management UI
- Usage dashboard
- Invoice history

**Action Required**: Verify frontend can:
- Create checkout sessions
- Access billing portal
- View subscription status
- View usage data

---

#### 9. Error Handling & Logging ⚠️ **NEEDS REVIEW**

**Action Required**:
- Add comprehensive error handling for Stripe API failures
- Add logging for billing events
- Set up alerts for failed payments
- Monitor webhook delivery failures

---

## 🧪 Testing Checklist

After completing above steps, test:

### Basic Functionality Tests

- [ ] **Create Checkout Session**
  ```bash
  POST /api/billing/checkout
  Body: { "planType": "starter" }
  ```
  Expected: Returns checkout URL

- [ ] **Complete Checkout** (in Stripe test mode)
  - Go to checkout URL
  - Complete payment
  - Verify webhook received
  - Check subscription created in database

- [ ] **Get Subscription**
  ```bash
  GET /api/billing/subscription
  ```
  Expected: Returns subscription details

- [ ] **Access Billing Portal**
  ```bash
  POST /api/billing/portal
  ```
  Expected: Returns portal URL

- [ ] **Track Usage**
  - Send SMS via Twilio
  - Check `billing_usage` table has record
  - Verify `tenantId`, `usageType`, `metadata` populated

- [ ] **Get Usage Summary**
  ```bash
  GET /api/billing/usage
  ```
  Expected: Returns usage summary by type

### Webhook Tests

- [ ] **Test Webhook Reception**
  - Use Stripe CLI: `stripe listen --forward-to localhost:5002/api/billing/webhook`
  - Trigger test event: `stripe trigger customer.subscription.created`
  - Verify webhook received and processed

- [ ] **Test Subscription Events**
  - Create subscription → verify `subscriptions` table updated
  - Update subscription → verify status updated
  - Cancel subscription → verify status = canceled

- [ ] **Test Invoice Events**
  - Invoice created → verify `invoices` table has record
  - Invoice paid → verify status = paid
  - Payment failed → verify status = uncollectible

---

## 📊 Current Configuration Status

### Environment Variables Status

```bash
# Check current .env configuration
grep STRIPE /root/SMS/backend/.env
```

**Required Variables**:
- ✅ `STRIPE_SECRET_KEY` - **CONFIGURED**
- ❌ `STRIPE_WEBHOOK_SECRET` - **MISSING**
- ❌ `STRIPE_PRICE_FREE` - **MISSING**
- ❌ `STRIPE_PRICE_STARTER` - **MISSING**
- ❌ `STRIPE_PRICE_PROFESSIONAL` - **MISSING**
- ❌ `STRIPE_PRICE_ENTERPRISE` - **MISSING**

**Optional Variables** (for usage-based billing):
- ❌ `STRIPE_METER_SMS_SENT` - **MISSING**
- ❌ `STRIPE_METER_CALL_DURATION` - **MISSING**
- ❌ `STRIPE_METER_AI_MESSAGE` - **MISSING**
- ❌ `STRIPE_METER_AI_VOICE` - **MISSING**

---

## 🚨 Critical Path to Go Live

**Minimum Required Steps** (in order):

1. ✅ **Run Database Migration** - Create `billing_usage` table
2. ✅ **Create Stripe Products** - Run setup script
3. ✅ **Add Price IDs to .env** - Copy from script output
4. ✅ **Configure Webhook** - Set up in Stripe Dashboard
5. ✅ **Add Webhook Secret to .env** - Copy from Stripe
6. ✅ **Restart Backend** - Load new environment variables
7. ✅ **Test Checkout Flow** - Create test subscription

**Estimated Time**: 30-60 minutes

---

## 📝 Summary

### What Works Now ✅
- Code is complete and compiles
- Stripe secret key configured
- Usage tracking code ready
- Database schema defined

### What's Missing ❌
- Database table not created (migration not run)
- Stripe products/prices not created
- Webhook not configured
- Price IDs not in environment
- Usage tracking not fully integrated
- Frontend integration not verified

### Priority Order
1. **CRITICAL**: Steps 1-3 (Database, Products, Webhook)
2. **IMPORTANT**: Step 4 (Usage tracking integration)
3. **OPTIONAL**: Steps 5-9 (Enhancements)

---

## 🆘 Need Help?

If you encounter issues:

1. **Check logs**: `tail -f /tmp/backend.log`
2. **Verify Stripe Dashboard**: Check webhook delivery status
3. **Test Stripe API**: Use Stripe CLI for testing
4. **Review documentation**: `backend/src/billing/README.md`

---

**Last Updated**: $(date)
**Status**: Ready for completion - follow checklist above

