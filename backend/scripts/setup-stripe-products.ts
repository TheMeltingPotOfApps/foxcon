/**
 * Script to create Stripe products and prices
 * Run with: npx ts-node backend/scripts/setup-stripe-products.ts
 */

import Stripe from 'stripe';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  console.error('STRIPE_SECRET_KEY not found in environment variables');
  process.exit(1);
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2025-11-17.clover',
});

interface PlanConfig {
  name: string;
  description: string;
  monthlyPrice: number; // in dollars
  yearlyPrice?: number; // in dollars (optional)
  features: string[];
}

const plans: Record<string, PlanConfig> = {
  free: {
    name: 'Free Plan',
    description: 'Perfect for getting started',
    monthlyPrice: 0,
    features: [
      '100 SMS messages/month',
      'Basic support',
      'Up to 100 contacts',
    ],
  },
  starter: {
    name: 'Starter Plan',
    description: 'For small businesses',
    monthlyPrice: 39.99,
    yearlyPrice: 399.90, // $399.90/year = ~$33.33/month (save ~$80/year)
    features: [
      '1,000 SMS messages/month',
      'Email support',
      'Up to 1,000 contacts',
      'Basic analytics',
    ],
  },
  professional: {
    name: 'Professional Plan',
    description: 'For growing businesses',
    monthlyPrice: 199.99,
    yearlyPrice: 1999.90, // $1999.90/year = ~$166.66/month (save ~$400/year)
    features: [
      '10,000 SMS messages/month',
      'Priority support',
      'Unlimited contacts',
      'Advanced analytics',
      'AI message generation',
      'Campaign automation',
    ],
  },
  enterprise: {
    name: 'Enterprise Plan',
    description: 'For large organizations',
    monthlyPrice: 899.99,
    yearlyPrice: 8999.90, // $8999.90/year = ~$749.99/month (save ~$1800/year)
    features: [
      'Unlimited SMS messages',
      'Dedicated support',
      'Unlimited contacts',
      'Advanced analytics',
      'AI message generation',
      'Campaign automation',
      'Custom integrations',
      'SLA guarantee',
    ],
  },
};

async function createProductsAndPrices() {
  console.log('Creating Stripe products and prices...\n');

  const createdProducts: Record<string, { productId: string; monthlyPriceId: string; yearlyPriceId?: string }> = {};

  for (const [planKey, plan] of Object.entries(plans)) {
    try {
      // Create product
      const product = await stripe.products.create({
        name: plan.name,
        description: plan.description,
        metadata: {
          planType: planKey,
          features: JSON.stringify(plan.features),
        },
      });

      console.log(`✓ Created product: ${plan.name} (${product.id})`);

      // Create monthly price
      const monthlyPrice = await stripe.prices.create({
        product: product.id,
        unit_amount: plan.monthlyPrice * 100, // Convert to cents
        currency: 'usd',
        recurring: {
          interval: 'month',
        },
        metadata: {
          planType: planKey,
          billingInterval: 'monthly',
        },
      });

      console.log(`  ✓ Created monthly price: $${plan.monthlyPrice}/month (${monthlyPrice.id})`);

      let yearlyPriceId: string | undefined;

      // Create yearly price if specified
      if (plan.yearlyPrice !== undefined) {
        const yearlyPrice = await stripe.prices.create({
          product: product.id,
          unit_amount: plan.yearlyPrice * 100, // Convert to cents
          currency: 'usd',
          recurring: {
            interval: 'year',
          },
          metadata: {
            planType: planKey,
            billingInterval: 'yearly',
          },
        });

        yearlyPriceId = yearlyPrice.id;
        console.log(`  ✓ Created yearly price: $${plan.yearlyPrice}/year (${yearlyPrice.id})`);
      }

      createdProducts[planKey] = {
        productId: product.id,
        monthlyPriceId: monthlyPrice.id,
        yearlyPriceId,
      };

      console.log('');
    } catch (error: any) {
      console.error(`✗ Error creating ${plan.name}:`, error.message);
    }
  }

  // Output environment variables
  console.log('\n=== Add these to your .env file ===\n');
  console.log(`# Stripe Product IDs`);
  for (const [planKey, data] of Object.entries(createdProducts)) {
    console.log(`STRIPE_PRODUCT_${planKey.toUpperCase()}=${data.productId}`);
  }

  console.log(`\n# Stripe Price IDs (Monthly)`);
  for (const [planKey, data] of Object.entries(createdProducts)) {
    console.log(`STRIPE_PRICE_${planKey.toUpperCase()}=${data.monthlyPriceId}`);
  }

  if (Object.values(createdProducts).some(p => p.yearlyPriceId)) {
    console.log(`\n# Stripe Price IDs (Yearly)`);
    for (const [planKey, data] of Object.entries(createdProducts)) {
      if (data.yearlyPriceId) {
        console.log(`STRIPE_PRICE_${planKey.toUpperCase()}_YEARLY=${data.yearlyPriceId}`);
      }
    }
  }

  console.log('\n=== Summary ===\n');
  console.log('Products and prices created successfully!');
  console.log('Make sure to:');
  console.log('1. Add the environment variables above to your .env file');
  console.log('2. Update your billing.service.ts to use these price IDs');
  console.log('3. Configure webhook endpoints in Stripe Dashboard');
  console.log('4. Set up billing meters if using usage-based billing');
}

// Run the script
createProductsAndPrices()
  .then(() => {
    console.log('\nDone!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

