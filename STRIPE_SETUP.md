# Stripe Configuration Complete

## ✅ Stripe Secret Key Added

Your Stripe live secret key has been added to `/root/SMS/backend/.env`:

```
STRIPE_SECRET_KEY=sk_live_YOUR_STRIPE_SECRET_KEY_HERE
```

## Next Steps

### 1. Create Stripe Products and Prices

Run the setup script to create products and prices in your Stripe account:

```bash
cd /root/SMS/backend
npx ts-node scripts/setup-stripe-products.ts
```

This will:
- Create products for Free, Starter, Professional, and Enterprise plans
- Create monthly and yearly prices
- Output the price IDs to add to your `.env` file

### 2. Configure Webhook Endpoint

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Set endpoint URL: `https://your-domain.com/api/billing/webhook`
   - For local testing: Use a tool like [ngrok](https://ngrok.com/) to expose your local server
4. Select events to listen for:
   - `customer.subscription.*`
   - `invoice.*`
   - `payment_method.*`
   - `customer.updated`
   - `checkout.session.completed`
5. Copy the webhook signing secret and add to `.env`:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

### 3. Add Price IDs to .env

After running the setup script, add the output price IDs to your `.env` file:

```env
# Stripe Price IDs (Monthly)
STRIPE_PRICE_FREE=price_...
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_PROFESSIONAL=price_...
STRIPE_PRICE_ENTERPRISE=price_...

# Stripe Price IDs (Yearly) - Optional
STRIPE_PRICE_FREE_YEARLY=price_...
STRIPE_PRICE_STARTER_YEARLY=price_...
STRIPE_PRICE_PROFESSIONAL_YEARLY=price_...
STRIPE_PRICE_ENTERPRISE_YEARLY=price_...
```

### 4. (Optional) Set Up Usage-Based Billing Meters

If you want usage-based billing:

1. Go to Stripe Dashboard → Billing → Meters
2. Create meters for:
   - SMS sent
   - Call duration
   - AI message generation
   - AI voice generation
3. Add meter IDs to `.env`:
   ```env
   STRIPE_METER_SMS_SENT=mtr_...
   STRIPE_METER_CALL_DURATION=mtr_...
   STRIPE_METER_AI_MESSAGE=mtr_...
   STRIPE_METER_AI_VOICE=mtr_...
   ```

### 5. Restart Your Application

After adding all configuration:

```bash
# If using PM2
pm2 restart backend

# Or restart your Node.js process
```

## Verification

Test the Stripe connection:

1. **Check logs** - The billing service will log if Stripe is configured correctly
2. **Create a test checkout** - Use the API endpoint to create a checkout session
3. **Check webhooks** - Verify webhook events are being received in Stripe Dashboard

## Security Notes

⚠️ **Important**: 
- This is a **live** Stripe key - it will charge real money
- Keep your `.env` file secure and never commit it to version control
- The `.env` file should be in `.gitignore`
- Consider using environment variables in production instead of `.env` file

## Support

For detailed billing documentation, see:
- `backend/src/billing/README.md` - Complete billing system documentation
- `BILLING_COMPLETE.md` - Implementation summary

