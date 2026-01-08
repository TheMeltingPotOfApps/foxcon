'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  Users,
  Shield,
  Zap,
  CheckCircle2,
  ArrowRight,
  BarChart3,
  DollarSign,
  Store,
  Sparkles,
  Star,
  Check,
  ArrowDown,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { AnimatedBackground } from '@/components/animated-background';

export default function NurtureLeadsLandingPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasHydrated = useAuthStore((state) => state._hasHydrated);

  useEffect(() => {
    if (hasHydrated && isAuthenticated) {
      router.push('/marketplace');
    }
  }, [hasHydrated, isAuthenticated, router]);

  const stats = [
    { value: '10K+', label: 'Leads Traded' },
    { value: '500+', label: 'Active Marketers' },
    { value: '99.9%', label: 'Uptime' },
    { value: '24/7', label: 'Support' },
  ];

  const features = [
    {
      icon: TrendingUp,
      title: 'Sell Your Leads',
      description: 'Monetize your lead generation efforts by selling high-quality leads to verified buyers.',
      highlight: 'Maximize revenue',
    },
    {
      icon: Users,
      title: 'Buy Quality Leads',
      description: 'Access a marketplace of verified, high-converting leads from trusted marketers.',
      highlight: 'Verified sources',
    },
    {
      icon: Zap,
      title: 'Real-Time Distribution',
      description: 'Get leads delivered instantly to your CRM with automatic distribution.',
      highlight: 'Instant delivery',
    },
    {
      icon: Shield,
      title: 'Verified Marketers',
      description: 'All sellers are verified through native platform integrations for quality assurance.',
      highlight: 'Quality guaranteed',
    },
    {
      icon: BarChart3,
      title: 'Advanced Analytics',
      description: 'Track performance metrics, contact rates, and ROI for all your lead activities.',
      highlight: 'Data-driven insights',
    },
    {
      icon: DollarSign,
      title: 'Flexible Pricing',
      description: 'Pay per lead with our Lead Reservations currency system.',
      highlight: 'Pay as you go',
    },
  ];

  const benefits = [
    'Native integrations with Facebook, TikTok, and Google Ads',
    'Custom ingestion endpoints for your campaigns',
    'Automated lead distribution and CRM sync',
    'Comprehensive analytics and reporting',
    'Secure payment processing',
    '24/7 customer support',
  ];

  const testimonials = [
    {
      name: 'Sarah Chen',
      role: 'Marketing Director',
      company: 'TechStart Inc.',
      content: 'We increased our lead quality by 3x using the marketplace. The verified sellers and real-time distribution make it effortless.',
      rating: 5,
    },
    {
      name: 'Michael Rodriguez',
      role: 'CEO',
      company: 'GrowthCo',
      content: 'The best investment we made this year. Our lead generation is now fully automated, saving us 20 hours per week.',
      rating: 5,
    },
    {
      name: 'Emily Johnson',
      role: 'Operations Manager',
      company: 'ScaleUp Solutions',
      content: 'The marketplace transformed how we source leads. We\'ve seen a 40% increase in conversion rates.',
      rating: 5,
    },
  ];

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
      
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-2 group">
              <Image 
                src="/engine-logo.svg" 
                alt="Nurture Engine" 
                width={140} 
                height={42}
                className="h-10 w-auto transition-opacity group-hover:opacity-80"
              />
            </Link>
            <div className="flex items-center gap-1">
              <Link href="/marketplace/login">
                <Button variant="ghost">Login</Button>
              </Link>
              <Link href="/signup">
                <Button className="bg-primary hover:bg-primary/90">Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 pt-20 pb-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium text-primary mb-8"
            >
              <Sparkles className="h-4 w-4" />
              <span>Trusted by 500+ businesses worldwide</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-6xl sm:text-7xl lg:text-8xl font-bold tracking-tight mb-6 leading-tight"
            >
              <span className="block text-primary">Buy & Sell Quality</span>
              <span className="block text-foreground">Leads That Convert</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-2xl sm:text-3xl text-muted-foreground mb-12 max-w-3xl mx-auto leading-relaxed"
            >
              Connect marketers with buyers. Sell quality leads. Grow your business.
              All in one powerful marketplace platform.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16"
            >
              <Link href="/signup">
                <Button size="lg" className="group text-lg px-10 py-7 h-auto bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href="/marketplace/login">
                <Button size="lg" variant="outline" className="text-lg px-10 py-7 h-auto border-2">
                  Sign In
                </Button>
              </Link>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto"
            >
              {stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-3xl md:text-4xl font-bold text-primary mb-1">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="flex flex-col items-center gap-2 text-muted-foreground"
          >
            <span className="text-sm">Scroll to explore</span>
            <ArrowDown className="h-5 w-5" />
          </motion.div>
        </motion.div>
      </section>

      {/* Key Features */}
      <section className="relative z-10 py-32 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-20"
          >
            <Badge className="mb-4 px-4 py-1.5 text-sm">Powerful Features</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Everything You Need to <span className="text-primary">Buy & Sell Leads</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Powerful tools designed to help you connect, trade, and grow your business
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: idx * 0.1 }}
                >
                  <Card className="h-full hover-lift border-2 p-8">
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Icon className="h-7 w-7 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-xl font-bold">{feature.title}</h3>
                          <Badge variant="secondary" className="text-xs">{feature.highlight}</Badge>
                        </div>
                        <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="relative z-10 py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <Badge className="mb-4">Why Choose Us</Badge>
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                The Most <span className="text-primary">Trusted</span> Lead Marketplace
              </h2>
              <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
                Our platform connects verified marketers with quality buyers, ensuring every lead 
                transaction is secure, transparent, and profitable.
              </p>
              <ul className="space-y-4 mb-8">
                {benefits.map((benefit) => (
                  <li key={benefit} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Check className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-lg">{benefit}</span>
                  </li>
                ))}
              </ul>
              <Link href="/signup">
                <Button size="lg" className="text-base px-8 py-6 h-auto">
                  Get Started Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative"
            >
              <Card className="border-2 shadow-2xl overflow-hidden">
                <div className="bg-muted/50 p-4 border-b flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-destructive"></div>
                  <div className="w-3 h-3 rounded-full bg-warning"></div>
                  <div className="w-3 h-3 rounded-full bg-success"></div>
                  <div className="flex-1 text-center text-sm font-medium">marketplace.nurtureengine.net</div>
                </div>
                <CardContent className="p-8 bg-gradient-to-br from-background to-muted/20 min-h-[400px] flex items-center justify-center">
                  <div className="text-center space-y-4">
                    <div className="w-24 h-24 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                      <Store className="h-12 w-12 text-primary" />
                    </div>
                    <div className="space-y-2">
                      <div className="h-3 bg-primary/20 rounded w-48 mx-auto"></div>
                      <div className="h-3 bg-primary/10 rounded w-32 mx-auto"></div>
                    </div>
                    <p className="text-sm text-muted-foreground">Lead Marketplace Preview</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="relative z-10 py-32 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-20"
          >
            <Badge className="mb-4 px-4 py-1.5 text-sm">Customer Success</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Loved by <span className="text-primary">500+ Businesses</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              See what our customers are saying about the lead marketplace
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {testimonials.map((testimonial, idx) => (
              <motion.div
                key={testimonial.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: idx * 0.1 }}
              >
                <Card className="h-full hover-lift border-2">
                  <CardContent className="p-8">
                    <div className="flex gap-1 mb-4">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="h-5 w-5 fill-warning text-warning" />
                      ))}
                    </div>
                    <p className="text-muted-foreground mb-6 leading-relaxed italic">
                      &quot;{testimonial.content}&quot;
                    </p>
                    <div>
                      <div className="font-semibold">{testimonial.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {testimonial.role}, {testimonial.company}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-32 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-4xl mx-auto text-center"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Ready to Transform Your Lead Generation?
            </h2>
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              Join hundreds of businesses using our marketplace to buy and sell quality leads. 
              Start your free trial today—no credit card required.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link href="/signup">
                <Button size="lg" className="text-lg px-10 py-7 h-auto bg-primary hover:bg-primary/90 shadow-lg">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/marketplace/login">
                <Button size="lg" variant="outline" className="text-lg px-10 py-7 h-auto border-2">
                  Sign In
                </Button>
              </Link>
            </div>
            <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                <span>14-day free trial</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                <span>Setup in 5 minutes</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                <span>Cancel anytime</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            <div>
              <Image 
                src="/engine-logo.svg" 
                alt="Nurture Engine" 
                width={120} 
                height={36}
                className="h-9 w-auto mb-4"
              />
              <p className="text-sm text-muted-foreground leading-relaxed">
                The most powerful platform for buying and selling quality leads. 
                Connect, trade, and grow with confidence.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/features" className="hover:text-foreground transition-colors">Features</Link></li>
                <li><Link href="/use-cases" className="hover:text-foreground transition-colors">Use Cases</Link></li>
                <li><Link href="/pricing" className="hover:text-foreground transition-colors">Pricing</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/about" className="hover:text-foreground transition-colors">About</Link></li>
                <li><Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link></li>
                <li><Link href="/security" className="hover:text-foreground transition-colors">Security</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Resources</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/docs" className="hover:text-foreground transition-colors">Documentation</Link></li>
                <li><Link href="/contact" className="hover:text-foreground transition-colors">Support</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-border/50 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Nurture Engine. All rights reserved.
            </p>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
              <Link href="/security" className="hover:text-foreground transition-colors">Security</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

