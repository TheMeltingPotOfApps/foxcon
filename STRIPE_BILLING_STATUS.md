# Stripe Billing System - Current Status & Action Items

## ✅ COMPLETED

1. **Database Migration** ✅
   - `billing_usage` table exists
   - All indexes created
   - Foreign keys configured

2. **Backend Code** ✅
   - All services implemented
   - All controllers implemented
   - All entities defined
   - Usage tracking integrated in TwilioService

3. **Stripe Secret Key** ✅
   - Configured in `.env`

---

## ❌ CRITICAL - Must Complete Before Going Live

### 1. Create Stripe Products & Prices ⚠️ **NOT DONE**

**Why Critical**: Without price IDs, checkout sessions will fail with error: "Price ID not configured"

**Action**:
```bash
cd /root/SMS/backend
npx ts-node scripts/setup-stripe-products.ts
```

**Then add output to `.env`**:
```env
STRIPE_PRICE_FREE=price_xxxxx
STRIPE_PRICE_STARTER=price_xxxxx
STRIPE_PRICE_PROFESSIONAL=price_xxxxx
STRIPE_PRICE_ENTERPRISE=price_xxxxx
```

**Time Required**: 5 minutes

---

### 2. Configure Stripe Webhook ⚠️ **NOT DONE**

**Why Critical**: Without webhook, subscription events won't sync to your database

**Action**:
1. Go to: https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. URL: `https://your-domain.com/api/billing/webhook`
   - For testing: Use ngrok or Stripe CLI
4. Select ALL subscription and invoice events
5. Copy signing secret
6. Add to `.env`:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_xxxxx
   ```

**Time Required**: 10 minutes

---

### 3. Restart Backend ⚠️ **REQUIRED AFTER CONFIG**

**Action**:
```bash
pm2 restart backend
# OR
# Restart your Node.js process
```

**Why**: To load new environment variables

**Time Required**: 1 minute

---

## 🟡 IMPORTANT - Complete for Full Functionality

### 4. Integrate Usage Tracking in Other Services ⚠️ **PARTIAL**

**Current Status**:
- ✅ TwilioService - Tracks SMS & calls
- ❌ CampaignsService - NOT integrated
- ❌ JourneysService - NOT integrated
- ❌ ConversationsService - Uses old tenant limits only

**Impact**: Campaigns, journeys, and other actions won't be tracked for billing

**Action Required**: Add `BillingUsageService` injection and track usage after successful actions

**Time Required**: 30-60 minutes

---

### 5. Fix Tenant Email in Customer Creation ⚠️ **MINOR ISSUE**

**Current**: Uses `tenant.name` as email (line 69 in billing.service.ts)

**Impact**: Stripe customer emails will be incorrect

**Action**: Update to use proper email field

**Time Required**: 5 minutes

---

## 🟢 OPTIONAL - Advanced Features

### 6. Implement Stripe Meter Sync ⚠️ **NOT IMPLEMENTED**

**Status**: Code exists but Stripe API call needs implementation

**When Needed**: Only if using usage-based billing (pay-per-use)

**Action**: 
- Create meters in Stripe Dashboard
- Implement correct API call
- Set up cron job

**Time Required**: 2-4 hours

---

## 📋 Quick Start Checklist

**To get billing working TODAY** (minimum viable):

- [ ] Run: `npx ts-node backend/scripts/setup-stripe-products.ts`
- [ ] Add price IDs to `.env`
- [ ] Configure webhook in Stripe Dashboard
- [ ] Add webhook secret to `.env`
- [ ] Restart backend
- [ ] Test checkout: `POST /api/billing/checkout` with `{"planType": "starter"}`

**Total Time**: ~20 minutes

---

## 🧪 Testing After Setup

### Test 1: Create Checkout Session
```bash
curl -X POST http://localhost:5002/api/billing/checkout \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"planType": "starter"}'
```

**Expected**: Returns `{"url": "https://checkout.stripe.com/..."}`

### Test 2: Complete Checkout (in Stripe test mode)
- Use test card: `4242 4242 4242 4242`
- Complete payment
- Check webhook received in Stripe Dashboard
- Verify subscription in database

### Test 3: Get Subscription
```bash
curl http://localhost:5002/api/billing/subscription \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected**: Returns subscription details

---

## 📊 Current Configuration

**Environment Variables Status**:
```
✅ STRIPE_SECRET_KEY - Configured
❌ STRIPE_WEBHOOK_SECRET - Missing
❌ STRIPE_PRICE_FREE - Missing
❌ STRIPE_PRICE_STARTER - Missing
❌ STRIPE_PRICE_PROFESSIONAL - Missing
❌ STRIPE_PRICE_ENTERPRISE - Missing
```

**Database Status**:
```
✅ billing_usage table - Exists
✅ subscriptions table - Exists (from previous migration)
✅ invoices table - Exists (from previous migration)
✅ payment_methods table - Exists (from previous migration)
```

---

## 🎯 Priority Order

1. **NOW** (Critical):
   - Create Stripe products/prices
   - Configure webhook
   - Add environment variables
   - Restart backend

2. **SOON** (Important):
   - Integrate usage tracking in campaigns/journeys
   - Fix tenant email issue
   - Test full flow

3. **LATER** (Optional):
   - Implement meter sync
   - Add usage-based billing
   - Enhance error handling

---

## 📞 Support Resources

- **Detailed Docs**: `/root/SMS/backend/src/billing/README.md`
- **Completion Checklist**: `/root/SMS/STRIPE_BILLING_COMPLETION_CHECKLIST.md`
- **Stripe Dashboard**: https://dashboard.stripe.com
- **Stripe API Docs**: https://stripe.com/docs/api

---

**Status**: 🟡 Ready for final configuration - 2 critical steps remaining

