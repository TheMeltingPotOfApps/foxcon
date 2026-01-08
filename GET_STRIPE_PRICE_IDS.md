# How to Get Stripe Price IDs

## ⚠️ Important Note

The values you provided (`$39.99`, `$199.99`, etc.) are **prices**, not **Stripe Price IDs**.

Stripe Price IDs look like: `price_1ABC123xyz...` (they start with `price_`)

## Option 1: Run the Setup Script (Recommended)

This will create products and prices in Stripe and output the IDs:

```bash
cd /root/SMS/backend
npx ts-node scripts/setup-stripe-products.ts
```

**Note**: The script uses these prices:
- Free: $0/month
- Starter: $29/month
- Professional: $99/month  
- Enterprise: $299/month

If you want different prices, edit `scripts/setup-stripe-products.ts` before running.

## Option 2: Get Price IDs from Stripe Dashboard

1. Go to: https://dashboard.stripe.com/products
2. For each product (Free, Starter, Professional, Enterprise):
   - Click on the product
   - Find the price section
   - Copy the Price ID (starts with `price_`)
   - Add to `.env`:
     ```env
     STRIPE_PRICE_FREE=price_xxxxx
     STRIPE_PRICE_STARTER=price_xxxxx
     STRIPE_PRICE_PROFESSIONAL=price_xxxxx
     STRIPE_PRICE_ENTERPRISE=price_xxxxx
     ```

## Option 3: Create Prices Manually in Stripe

If products don't exist yet:

1. Go to: https://dashboard.stripe.com/products
2. Click "Add product"
3. Create each product:
   - **Free Plan**: $0/month
   - **Starter Plan**: $39.99/month (or your preferred price)
   - **Professional Plan**: $199.99/month
   - **Enterprise Plan**: $899.99/month
4. After creating each price, copy the Price ID
5. Add to `.env` as shown above

## Current Prices You Want

Based on your input:
- Free: $0/month
- Starter: $39.99/month
- Professional: $199.99/month
- Enterprise: $899.99/month

## After Getting Price IDs

Add them to `/root/SMS/backend/.env`:

```env
# Stripe Price IDs (Monthly)
STRIPE_PRICE_FREE=price_xxxxx
STRIPE_PRICE_STARTER=price_xxxxx
STRIPE_PRICE_PROFESSIONAL=price_xxxxx
STRIPE_PRICE_ENTERPRISE=price_xxxxx
```

Then restart your backend:
```bash
pm2 restart backend
```

## Verify Configuration

Check that all required variables are set:

```bash
grep STRIPE /root/SMS/backend/.env
```

You should see:
- ✅ STRIPE_SECRET_KEY
- ✅ STRIPE_WEBHOOK_SECRET
- ✅ STRIPE_PRICE_FREE
- ✅ STRIPE_PRICE_STARTER
- ✅ STRIPE_PRICE_PROFESSIONAL
- ✅ STRIPE_PRICE_ENTERPRISE

