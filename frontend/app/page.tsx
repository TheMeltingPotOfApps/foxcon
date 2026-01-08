'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Workflow, 
  Zap, 
  ArrowRight,
  Check,
  Play,
  TrendingUp,
  BarChart3,
  Clock,
  Users,
  Sparkles,
  ChevronRight,
  Star,
  ArrowDown,
  Phone
} from 'lucide-react';
import { LeadFunnelForm } from '@/components/lead-funnel-form';
import { AnimatedBackground } from '@/components/animated-background';

const stats = [
  { value: '10M+', label: 'Messages Sent' },
  { value: '50K+', label: 'Active Journeys' },
  { value: '99.9%', label: 'Uptime' },
  { value: '24/7', label: 'Support' },
];

const journeyExamples = [
  {
    title: 'Welcome New Customers',
    description: 'Automatically onboard new signups with a personalized 5-step journey',
    steps: ['Welcome SMS', 'Product Tour', 'Feature Highlight', 'Support Offer', 'Feedback Request'],
    result: '40% increase in activation',
  },
  {
    title: 'Nurture Leads',
    description: 'Convert leads with intelligent follow-up sequences',
    steps: ['Initial Contact', 'Value Proposition', 'Case Study', 'Demo Offer', 'Close'],
    result: '3x conversion rate',
  },
  {
    title: 'Reduce Churn',
    description: 'Re-engage inactive customers before they cancel',
    steps: ['Engagement Check', 'Special Offer', 'Feature Update', 'Success Story', 'Retention Call'],
    result: '25% churn reduction',
  },
];

const features = [
  {
    icon: Workflow,
    title: 'Visual Journey Builder',
    description: 'Drag-and-drop interface that makes complex automation simple. No coding required.',
    highlight: 'Build in minutes, not days',
  },
  {
    icon: Zap,
    title: 'Smart Automation',
    description: 'Intelligent branching based on customer behavior, responses, and attributes.',
    highlight: 'AI-powered decisions',
  },
  {
    icon: BarChart3,
    title: 'Real-Time Analytics',
    description: 'Track every step of your journey with detailed performance metrics.',
    highlight: 'Data-driven optimization',
  },
  {
    icon: Clock,
    title: 'Perfect Timing',
    description: 'Schedule messages for optimal send times based on timezone and behavior.',
    highlight: 'Right message, right time',
  },
];

const testimonials = [
  {
    name: 'Sarah Chen',
    role: 'Marketing Director',
    company: 'TechStart Inc.',
    content: 'We increased our conversion rate by 3x using journey automation. The visual builder makes it so easy to create complex workflows.',
    rating: 5,
  },
  {
    name: 'Michael Rodriguez',
    role: 'CEO',
    company: 'GrowthCo',
    content: 'The best investment we made this year. Our customer onboarding is now fully automated, saving us 20 hours per week.',
    rating: 5,
  },
  {
    name: 'Emily Johnson',
    role: 'Operations Manager',
    company: 'ScaleUp Solutions',
    content: 'Journey automation transformed how we engage customers. We&apos;ve seen a 40% increase in customer activation.',
    rating: 5,
  },
];

export default function HomePage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasHydrated = useAuthStore((state) => state._hasHydrated);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      
      // If accessing via leads.nurtureengine.net, redirect to Marketplace
      if (hostname === 'leads.nurtureengine.net' || hostname.startsWith('leads.')) {
        if (hasHydrated && isAuthenticated) {
          router.push('/marketplace');
        } else {
          router.push('/nurture-leads-landing');
        }
        return;
      }
      
      // Default behavior for app.nurtureengine.net
      if (hasHydrated && isAuthenticated) {
        router.push('/dashboard');
      }
    }
  }, [hasHydrated, isAuthenticated, router]);

  if (!hasHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary/20 border-t-primary"></div>
      </div>
    );
  }

  if (isAuthenticated) {
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
              <Link href="/features">
                <Button variant="ghost" className="hidden sm:flex">Features</Button>
              </Link>
              <Link href="/use-cases">
                <Button variant="ghost" className="hidden sm:flex">Use Cases</Button>
              </Link>
              <Link href="/pricing">
                <Button variant="ghost">Pricing</Button>
              </Link>
              <Link href="/login">
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
              <span>Trusted by 5,000+ businesses worldwide</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-6xl sm:text-7xl lg:text-8xl font-bold tracking-tight mb-6 leading-tight"
            >
              <span className="block text-primary">Automate Customer</span>
              <span className="block text-foreground">Journeys That Convert</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-2xl sm:text-3xl text-muted-foreground mb-12 max-w-3xl mx-auto leading-relaxed"
            >
              Build intelligent automation workflows that engage customers, drive conversions, 
              and scale your business—all without writing a single line of code.
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
              <Link href="/book-a-call">
                <Button size="lg" variant="outline" className="text-lg px-10 py-7 h-auto border-2">
                  <Phone className="mr-2 h-5 w-5" />
                  Book a Call
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
              {stats.map((stat, idx) => (
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

      {/* Journey Examples */}
      <section className="relative z-10 py-32 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-20"
          >
            <Badge className="mb-4 px-4 py-1.5 text-sm">Real Results</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              See How Businesses Use <span className="text-primary">Journey Automation</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Real examples from companies that transformed their customer engagement
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {journeyExamples.map((example, idx) => (
              <motion.div
                key={example.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: idx * 0.1 }}
              >
                <Card className="h-full hover-lift border-2 bg-card/50 backdrop-blur-sm">
                  <CardContent className="p-8">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Workflow className="h-6 w-6 text-primary" />
                      </div>
                      <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
                        {example.result}
                      </Badge>
                    </div>
                    <h3 className="text-xl font-bold mb-2">{example.title}</h3>
                    <p className="text-muted-foreground mb-6">{example.description}</p>
                    <div className="space-y-2">
                      {example.steps.map((step, stepIdx) => (
                        <div key={stepIdx} className="flex items-center gap-3 text-sm">
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-xs font-bold text-primary">
                            {stepIdx + 1}
                          </div>
                          <span>{step}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Visual Journey Builder Preview */}
      <section className="relative z-10 py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <Badge className="mb-4">Visual Builder</Badge>
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Build Complex Workflows in <span className="text-primary">Minutes</span>
              </h2>
              <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
                Our drag-and-drop journey builder makes it easy to create sophisticated automation 
                workflows. Connect nodes, set conditions, and launch—no technical skills required.
              </p>
              <ul className="space-y-4 mb-8">
                {[
                  'Drag-and-drop interface',
                  'Conditional branching logic',
                  'Time delays and scheduling',
                  'Multi-step sequences',
                  'Real-time preview',
                ].map((feature) => (
                  <li key={feature} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Check className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-lg">{feature}</span>
                  </li>
                ))}
              </ul>
              <Link href="/signup">
                <Button size="lg" className="text-base px-8 py-6 h-auto">
                  Try the Builder Free
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
                  <div className="flex-1 text-center text-sm font-medium">journey-builder.nurtureengine.net</div>
                </div>
                <CardContent className="p-8 bg-gradient-to-br from-background to-muted/20 min-h-[400px] flex items-center justify-center">
                  <div className="text-center space-y-4">
                    <div className="w-24 h-24 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                      <Workflow className="h-12 w-12 text-primary" />
                    </div>
                    <div className="space-y-2">
                      <div className="h-3 bg-primary/20 rounded w-48 mx-auto"></div>
                      <div className="h-3 bg-primary/10 rounded w-32 mx-auto"></div>
                    </div>
                    <p className="text-sm text-muted-foreground">Visual Journey Builder Preview</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
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
              Everything You Need to <span className="text-primary">Automate Success</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Powerful tools designed to help you create, manage, and optimize customer journeys
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {features.map((feature, idx) => (
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
                      <feature.icon className="h-7 w-7 text-primary" />
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
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="relative z-10 py-32">
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
              Loved by <span className="text-primary">5,000+ Businesses</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              See what our customers are saying about journey automation
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
              Ready to Transform Your Customer Engagement?
            </h2>
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              Join thousands of businesses using journey automation to drive growth. 
              Start your free trial today—no credit card required.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link href="/signup">
                <Button size="lg" className="text-lg px-10 py-7 h-auto bg-primary hover:bg-primary/90 shadow-lg">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/pricing">
                <Button size="lg" variant="outline" className="text-lg px-10 py-7 h-auto border-2">
                  View Pricing
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
                The most powerful platform for automating customer journeys. 
                Build, launch, and scale with confidence.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/features" className="hover:text-foreground transition-colors">Features</Link></li>
                <li><Link href="/use-cases" className="hover:text-foreground transition-colors">Use Cases</Link></li>
                <li><Link href="/how-it-works" className="hover:text-foreground transition-colors">How It Works</Link></li>
                <li><Link href="/pricing" className="hover:text-foreground transition-colors">Pricing</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/about" className="hover:text-foreground transition-colors">About</Link></li>
                <li><Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link></li>
                <li><Link href="/security" className="hover:text-foreground transition-colors">Security</Link></li>
                <li><Link href="/docs" className="hover:text-foreground transition-colors">Documentation</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Resources</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/integrations" className="hover:text-foreground transition-colors">Integrations</Link></li>
                <li><Link href="/docs" className="hover:text-foreground transition-colors">API Docs</Link></li>
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
