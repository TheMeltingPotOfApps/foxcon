# Billing System Documentation

## Overview

This billing system provides complete Stripe integration with comprehensive usage tracking and attribution for all tenant actions.

## Features

### 1. Stripe Integration
- **Customer Management**: Automatic Stripe customer creation and linking
- **Checkout Sessions**: Create Stripe checkout sessions for plan upgrades
- **Billing Portal**: Access to Stripe customer portal for self-service management
- **Subscription Management**: Full subscription lifecycle management
- **Invoice Tracking**: Complete invoice history and payment tracking
- **Payment Methods**: Manage saved payment methods

### 2. Usage Tracking
- **Comprehensive Tracking**: Track all billable actions from every tenant
- **Action Attribution**: Every action is linked to:
  - Tenant ID
  - User ID (if applicable)
  - Resource ID and type
  - Timestamp
  - Metadata (SMS SID, Call SID, etc.)
- **Billing Period Tracking**: Usage aggregated by billing period (YYYY-MM)
- **Stripe Integration**: Sync usage to Stripe billing meters for usage-based billing

### 3. Webhook Handling
Complete webhook handling for all Stripe events:
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.created`
- `invoice.finalized`
- `invoice.paid`
- `invoice.payment_failed`
- `invoice.payment_action_required`
- `invoice.upcoming`
- `payment_method.attached`
- `payment_method.detached`
- `customer.updated`
- `checkout.session.completed`

## Setup

### 1. Environment Variables

Add these to your `.env` file:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Product IDs (created via setup script)
STRIPE_PRODUCT_FREE=prod_...
STRIPE_PRODUCT_STARTER=prod_...
STRIPE_PRODUCT_PROFESSIONAL=prod_...
STRIPE_PRODUCT_ENTERPRISE=prod_...

# Stripe Price IDs (Monthly)
STRIPE_PRICE_FREE=price_...
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_PROFESSIONAL=price_...
STRIPE_PRICE_ENTERPRISE=price_...

# Stripe Meter IDs (for usage-based billing)
STRIPE_METER_SMS_SENT=mtr_...
STRIPE_METER_CALL_DURATION=mtr_...
STRIPE_METER_AI_MESSAGE=mtr_...
STRIPE_METER_AI_VOICE=mtr_...
```

### 2. Create Stripe Products and Prices

Run the setup script to create products and prices in Stripe:

```bash
cd backend
npx ts-node scripts/setup-stripe-products.ts
```

This will:
- Create products for Free, Starter, Professional, and Enterprise plans
- Create monthly and yearly prices
- Output environment variables to add to your `.env` file

### 3. Run Database Migrations

Run the migration to create the billing_usage table. The script automatically reads database credentials from your `.env` file.

**Using Node.js (Recommended):**
```bash
cd backend
node scripts/run-billing-usage-migration.js
```

**Using TypeScript:**
```bash
cd backend
npx ts-node scripts/run-billing-usage-migration.ts
```

**Manual with psql:**
```bash
psql -h localhost -U sms_user -d sms_platform -f backend/migrations/create-billing-usage-table.sql
```

The script will:
- Read `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE` from `.env`
- Connect to the database
- Run the migration SQL
- Verify the table was created
- Show table structure and indexes

### 4. Configure Stripe Webhooks

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://your-domain.com/api/billing/webhook`
3. Select events to listen for:
   - `customer.subscription.*`
   - `invoice.*`
   - `payment_method.*`
   - `customer.updated`
   - `checkout.session.completed`
4. Copy the webhook secret and add to `STRIPE_WEBHOOK_SECRET`

## Usage

### Tracking Usage

Usage is automatically tracked when actions occur. To manually track usage:

```typescript
import { BillingUsageService } from './billing/billing-usage.service';
import { BillingUsageType } from './entities/billing-usage.entity';

// Track SMS sent
await billingUsageService.trackUsage({
  tenantId: 'tenant-uuid',
  usageType: BillingUsageType.SMS_SENT,
  quantity: 1,
  userId: 'user-uuid',
  resourceId: 'message-uuid',
  resourceType: 'message',
  metadata: {
    messageSid: 'SM123...',
    to: '+1234567890',
  },
});
```

### Getting Usage Summary

```typescript
// Get usage summary for a tenant
const summary = await billingUsageService.getUsageSummary(
  tenantId,
  startDate,
  endDate
);

// Get usage by type
const smsUsage = await billingUsageService.getUsageByType(
  tenantId,
  BillingUsageType.SMS_SENT,
  startDate,
  endDate
);
```

### Syncing Usage to Stripe

For usage-based billing, sync usage to Stripe meters:

```typescript
// Sync all unsynced usage
const syncedCount = await billingUsageService.syncUsageToStripe(
  tenantId,
  BillingUsageType.SMS_SENT
);

// Sync specific date range
const syncedCount = await billingUsageService.syncUsageToStripe(
  tenantId,
  BillingUsageType.SMS_SENT,
  startDate,
  endDate
);
```

## API Endpoints

### Billing Endpoints

- `POST /api/billing/checkout` - Create checkout session
- `POST /api/billing/portal` - Create billing portal session
- `GET /api/billing/subscription` - Get current subscription
- `GET /api/billing/invoices` - Get invoice history
- `GET /api/billing/payment-methods` - Get payment methods
- `POST /api/billing/subscription/cancel` - Cancel subscription
- `GET /api/billing/usage` - Get usage summary
- `GET /api/billing/usage/:usageType` - Get usage by type
- `POST /api/billing/usage/sync` - Sync usage to Stripe

### Webhook Endpoint

- `POST /api/billing/webhook` - Stripe webhook handler

## Tracked Usage Types

- `SMS_SENT` - SMS messages sent
- `SMS_RECEIVED` - SMS messages received
- `CALL_MADE` - Outbound calls made
- `CALL_RECEIVED` - Inbound calls received
- `CALL_DURATION_SECONDS` - Call duration in seconds
- `AI_MESSAGE_GENERATED` - AI-generated messages
- `AI_VOICE_GENERATED` - AI-generated voice
- `AI_TEMPLATE_CREATED` - AI templates created
- `CONTENT_AI_GENERATED` - Content AI generations
- `CAMPAIGN_LAUNCHED` - Campaigns launched
- `JOURNEY_LAUNCHED` - Journeys launched
- `CONTACT_CREATED` - Contacts created
- `TEMPLATE_CREATED` - Templates created
- `WEBHOOK_TRIGGERED` - Webhooks triggered
- `STORAGE_USED_MB` - Storage used in MB
- `API_REQUEST` - API requests made

## Integration Points

Usage tracking is automatically integrated into:
- `TwilioService` - Tracks SMS and calls
- `ConversationsService` - Tracks messages sent
- `CampaignsService` - Tracks campaign launches
- `JourneysService` - Tracks journey launches

To add tracking to other services, inject `BillingUsageService` and call `trackUsage()` after successful actions.

## Best Practices

1. **Always track usage after successful actions** - Don't track failed attempts
2. **Include relevant metadata** - Store IDs, phone numbers, etc. for debugging
3. **Sync usage regularly** - Set up a cron job to sync usage to Stripe daily
4. **Monitor webhook events** - Check Stripe dashboard for webhook delivery status
5. **Handle errors gracefully** - Usage tracking failures shouldn't break core functionality

## Troubleshooting

### Webhooks not received
- Check webhook endpoint URL is accessible
- Verify `STRIPE_WEBHOOK_SECRET` matches Stripe dashboard
- Check webhook event logs in Stripe dashboard

### Usage not syncing to Stripe
- Verify Stripe meter IDs are configured
- Check subscription has usage-based billing items
- Ensure usage records have `syncedToStripe = false`

### Plan type not updating
- Check subscription metadata includes `tenantId`
- Verify price IDs match environment variables
- Check webhook events are being received

