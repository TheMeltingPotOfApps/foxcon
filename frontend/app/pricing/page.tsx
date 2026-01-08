'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, ArrowRight, Zap, Building2, Rocket, Mail } from 'lucide-react';
import { useCreateCheckoutSession, PlanType } from '@/lib/hooks/use-billing';
import { toast } from 'sonner';
import { AnimatedBackground } from '@/components/animated-background';

const plans = [
  {
    name: 'Starter',
    price: '$49',
    period: '/month',
    description: 'Perfect for small businesses getting started with automation',
    icon: Zap,
    features: [
      'Up to 5,000 messages/month',
      'Unlimited journeys',
      'Visual journey builder',
      'Basic analytics',
      'Email support',
      'API access',
      'Webhook integrations',
    ],
    highlight: false,
    planType: PlanType.STARTER,
  },
  {
    name: 'Professional',
    price: '$149',
    period: '/month',
    description: 'For growing businesses that need advanced features',
    icon: Rocket,
    features: [
      'Up to 25,000 messages/month',
      'Everything in Starter',
      'Advanced analytics & reporting',
      'A/B testing',
      'Priority support',
      'Custom segments',
      'Advanced automation rules',
      'Dedicated account manager',
    ],
    highlight: true,
    planType: PlanType.PROFESSIONAL,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For large organizations with custom requirements',
    icon: Building2,
    features: [
      'Unlimited messages',
      'Everything in Professional',
      'Custom SLA',
      'Dedicated infrastructure',
      '24/7 phone support',
      'Custom integrations',
      'On-premise deployment options',
      'Advanced security features',
    ],
    highlight: false,
    planType: PlanType.ENTERPRISE,
  },
];

export default function PricingPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasHydrated = useAuthStore((state) => state._hasHydrated);
  const createCheckoutSession = useCreateCheckoutSession();

  useEffect(() => {
    if (hasHydrated && !isAuthenticated) {
      // Allow unauthenticated users to view pricing
    }
  }, [hasHydrated, isAuthenticated]);

  const handlePlanSelect = async (planType: PlanType) => {
    if (!isAuthenticated) {
      router.push('/signup');
      return;
    }

    if (planType === PlanType.ENTERPRISE) {
      window.location.href = 'mailto:sales@nurtureengine.net?subject=Enterprise Plan Inquiry';
      return;
    }

    try {
      const { url } = await createCheckoutSession.mutateAsync({
        planType,
        successUrl: `${window.location.origin}/settings?success=true`,
        cancelUrl: `${window.location.origin}/pricing?canceled=true`,
      });

      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      toast.error('Failed to create checkout session. Please try again.');
      console.error('Checkout error:', error);
    }
  };

  if (!hasHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary/20 border-t-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <AnimatedBackground />

      {/* Hero */}
      <section className="relative z-10 border-b border-border/50 py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center max-w-4xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Badge className="mb-6 px-4 py-1.5 text-sm">Simple Pricing</Badge>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
              Choose Your <span className="text-primary">Journey Plan</span>
            </h1>
            <p className="text-xl sm:text-2xl text-muted-foreground leading-relaxed">
              Start free, scale as you grow. All plans include unlimited journeys and our powerful visual builder.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="relative z-10 py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan, idx) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: idx * 0.1 }}
              >
                <Card
                  className={`h-full flex flex-col border-2 hover-lift ${
                    plan.highlight
                      ? 'border-primary shadow-xl scale-105'
                      : 'border-border'
                  }`}
                >
                  {plan.highlight && (
                    <div className="bg-primary text-primary-foreground text-center py-2 text-sm font-semibold">
                      Most Popular
                    </div>
                  )}
                  <CardHeader className="text-center pb-8">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <plan.icon className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="text-2xl mb-2">{plan.name}</CardTitle>
                    <CardDescription className="text-base mb-4">
                      {plan.description}
                    </CardDescription>
                    <div className="flex items-baseline justify-center gap-1 mb-2">
                      <span className="text-5xl font-bold">{plan.price}</span>
                      {plan.period && (
                        <span className="text-muted-foreground">{plan.period}</span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <ul className="space-y-3">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-3">
                          <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button
                      className="w-full"
                      size="lg"
                      variant={plan.highlight ? 'default' : 'outline'}
                      onClick={() => handlePlanSelect(plan.planType)}
                      disabled={createCheckoutSession.isPending}
                    >
                      {plan.planType === PlanType.ENTERPRISE ? (
                        <>
                          <Mail className="mr-2 h-4 w-4" />
                          Contact Sales
                        </>
                      ) : (
                        <>
                          Get Started
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="relative z-10 py-32 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-center mb-16">
              Frequently Asked Questions
            </h2>
            <div className="space-y-6">
              {[
                {
                  q: 'Can I change plans later?',
                  a: 'Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and we&apos;ll prorate any charges.',
                },
                {
                  q: 'What happens if I exceed my message limit?',
                  a: 'We&apos;ll notify you when you&apos;re approaching your limit. You can upgrade your plan or purchase additional message credits.',
                },
                {
                  q: 'Do you offer refunds?',
                  a: 'Yes, we offer a 30-day money-back guarantee. If you&apos;re not satisfied, contact us for a full refund.',
                },
                {
                  q: 'Is there a free trial?',
                  a: 'Yes! All plans include a 14-day free trial. No credit card required to start.',
                },
              ].map((faq, idx) => (
                <Card key={idx} className="border-2">
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-lg mb-2">{faq.q}</h3>
                    <p className="text-muted-foreground">{faq.a}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Ready to Get Started?
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Start your free trial today. No credit card required.
            </p>
            <Link href="/signup">
              <Button size="lg" className="text-lg px-10 py-7 h-auto">
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
