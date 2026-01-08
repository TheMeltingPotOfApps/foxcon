'use client';

import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Target, Users, Zap, Shield, TrendingUp, Heart } from 'lucide-react';
import { AnimatedBackground } from '@/components/animated-background';

const values = [
  {
    icon: Target,
    title: 'Mission-Driven',
    description: 'We believe automation should empower businesses to build better customer relationships through intelligent journey design.',
  },
  {
    icon: Zap,
    title: 'Innovation First',
    description: 'We continuously innovate to provide the most powerful and intuitive journey automation tools on the market.',
  },
  {
    icon: Users,
    title: 'Customer-Centric',
    description: 'Your success is our success. We build features based on real customer needs and feedback.',
  },
  {
    icon: Shield,
    title: 'Trust & Security',
    description: 'Enterprise-grade security and compliance to protect your data and your customers&apos; privacy.',
  },
];

const stats = [
  { value: '5,000+', label: 'Active Businesses' },
  { value: '50M+', label: 'Journey Steps Executed' },
  { value: '99.9%', label: 'Uptime' },
  { value: '24/7', label: 'Support' },
];

export default function AboutPage() {
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
            <Badge className="mb-6 px-4 py-1.5 text-sm">Our Story</Badge>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
              Building the Future of <span className="text-primary">Customer Automation</span>
            </h1>
            <p className="text-xl sm:text-2xl text-muted-foreground leading-relaxed">
              We&apos;re on a mission to make journey automation accessible, powerful, and delightful for businesses of all sizes.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Story */}
      <section className="relative z-10 py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="prose prose-lg dark:prose-invert mx-auto"
            >
              <h2 className="text-4xl font-bold mb-8">Our Story</h2>
              <div className="space-y-6 text-lg text-muted-foreground leading-relaxed">
                <p>
                  Nurture Engine was founded with a simple mission: make customer journey automation accessible 
                  to businesses of all sizes. We saw that existing solutions were either too complex, 
                  too expensive, or lacked the flexibility businesses needed to create truly personalized experiences.
                </p>
                <p>
                  We started by asking ourselves: &quot;What if building sophisticated automation workflows was as easy 
                  as drawing a flowchart?&quot; That question led us to create our visual journey builder—a drag-and-drop 
                  interface that makes complex automation simple, intuitive, and powerful.
                </p>
                <p>
                  Today, we&apos;re proud to serve thousands of businesses worldwide, helping them automate customer 
                  journeys, drive conversions, and build stronger relationships with their customers. From small startups 
                  to Fortune 500 companies, our platform scales to meet any need.
                </p>
                <p>
                  Our commitment is to continue innovating, listening to our customers, and building the tools that 
                  help businesses succeed. Because when businesses succeed, everyone wins.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="relative z-10 py-32 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-5xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-primary mb-2">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Values */}
      <section className="relative z-10 py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-20"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Badge className="mb-4 px-4 py-1.5 text-sm">Our Values</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              What We <span className="text-primary">Stand For</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              The principles that guide everything we do
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {values.map((value, idx) => (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: idx * 0.1 }}
              >
                <Card className="h-full hover-lift border-2 p-8">
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <value.icon className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{value.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{value.description}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Culture */}
      <section className="relative z-10 py-32 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <Heart className="h-10 w-10 text-primary" />
              </div>
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Join Us on This Journey
              </h2>
              <p className="text-xl text-muted-foreground leading-relaxed mb-8">
                We&apos;re always looking for talented people who share our passion for building great products 
                and helping businesses succeed. If you&apos;re interested in joining our team, we&apos;d love to hear from you.
              </p>
              <p className="text-lg text-muted-foreground">
                Check out our careers page or reach out to us at{' '}
                <a href="mailto:careers@nurtureengine.net" className="text-primary hover:underline">
                  careers@nurtureengine.net
                </a>
              </p>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}
