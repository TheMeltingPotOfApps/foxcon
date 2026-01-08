'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  PlayCircle, 
  Workflow, 
  Zap, 
  BarChart3,
  ArrowRight,
  Check,
  Sparkles
} from 'lucide-react';
import { AnimatedBackground } from '@/components/animated-background';
import { JourneyDemo } from '@/components/interactive/journey-demo';

const steps = [
  {
    number: '01',
    title: 'Create Your Journey',
    description: 'Use our visual drag-and-drop builder to design your automation workflow. Add steps, set conditions, and configure timing—all without coding.',
    icon: Workflow,
    details: [
      'Choose from pre-built templates or start from scratch',
      'Drag and drop nodes to build your flow',
      'Set entry criteria and conditions',
      'Configure time delays and scheduling',
    ],
  },
  {
    number: '02',
    title: 'Configure Triggers',
    description: 'Define when and how contacts enter your journey. Use segments, tags, webhooks, or manual enrollment.',
    icon: Zap,
    details: [
      'Set up automatic triggers based on events',
      'Use segments to target specific audiences',
      'Enable manual enrollment for flexibility',
      'Integrate with webhooks for custom triggers',
    ],
  },
  {
    number: '03',
    title: 'Launch & Monitor',
    description: 'Activate your journey and watch it work. Real-time analytics show you exactly what&apos;s happening at every step.',
    icon: BarChart3,
    details: [
      'Launch with one click',
      'Monitor performance in real-time',
      'Track conversions and drop-offs',
      'Optimize based on data insights',
    ],
  },
  {
    number: '04',
    title: 'Optimize & Scale',
    description: 'Use analytics to identify bottlenecks and improve your journey. A/B test different paths and scale what works.',
    icon: Sparkles,
    details: [
      'Analyze performance metrics',
      'Identify optimization opportunities',
      'A/B test different approaches',
      'Scale successful journeys',
    ],
  },
];

export default function HowItWorksPage() {
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
            <Badge className="mb-6 px-4 py-1.5 text-sm">Simple Process</Badge>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
              How Journey Automation <span className="text-primary">Works</span>
            </h1>
            <p className="text-xl sm:text-2xl text-muted-foreground leading-relaxed">
              Get started in minutes. Build your first journey, launch it, and watch your customer engagement transform.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Steps */}
      <section className="relative z-10 py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto space-y-32">
            {steps.map((step, idx) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: idx * 0.1 }}
                className="grid lg:grid-cols-2 gap-16 items-center"
              >
                <div className={idx % 2 === 0 ? '' : 'lg:order-2'}>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="text-6xl md:text-7xl font-bold text-primary/20">
                      {step.number}
                    </div>
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <step.icon className="h-8 w-8 text-primary" />
                    </div>
                  </div>
                  <h2 className="text-3xl md:text-4xl font-bold mb-4">{step.title}</h2>
                  <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
                    {step.description}
                  </p>
                  <ul className="space-y-3">
                    {step.details.map((detail) => (
                      <li key={detail} className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-foreground">{detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className={idx % 2 === 0 ? 'lg:order-2' : ''}>
                  <Card className="border-2 shadow-2xl overflow-hidden">
                    <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-12 min-h-[400px] flex items-center justify-center">
                      <div className="text-center space-y-6">
                        <div className="w-32 h-32 rounded-3xl bg-primary/20 flex items-center justify-center mx-auto">
                          <step.icon className="h-16 w-16 text-primary" />
                        </div>
                        <div className="space-y-3">
                          <div className="h-4 bg-primary/20 rounded w-64 mx-auto"></div>
                          <div className="h-4 bg-primary/10 rounded w-48 mx-auto"></div>
                          <div className="h-4 bg-primary/10 rounded w-56 mx-auto"></div>
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive Demo */}
      <section className="relative z-10 py-32 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Badge className="mb-4 px-4 py-1.5 text-sm">Try It Yourself</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              See It In <span className="text-primary">Action</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Watch a journey execute step-by-step. Click play to see how automation flows through each stage.
            </p>
          </motion.div>
          <div className="max-w-4xl mx-auto mb-12">
            <JourneyDemo />
          </div>
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/signup">
                <Button size="lg" className="text-lg px-10 py-7 h-auto">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="text-lg px-10 py-7 h-auto border-2">
                <PlayCircle className="mr-2 h-5 w-5" />
                Watch Full Demo Video
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Quick Start */}
      <section className="relative z-10 py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="border-2 shadow-xl max-w-4xl mx-auto p-12">
            <motion.div
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <Badge className="mb-6 px-4 py-1.5 text-sm">Get Started Today</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Launch Your First Journey in 5 Minutes
              </h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                No credit card required. Start your free trial and experience the power of journey automation.
              </p>
              <div className="grid sm:grid-cols-3 gap-6 mb-10">
                {[
                  { label: 'Sign Up', time: '1 min' },
                  { label: 'Create Journey', time: '3 min' },
                  { label: 'Launch', time: '1 min' },
                ].map((step, idx) => (
                  <div key={step.label} className="text-center">
                    <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <span className="text-2xl font-bold text-primary">{idx + 1}</span>
                    </div>
                    <div className="font-semibold mb-1">{step.label}</div>
                    <div className="text-sm text-muted-foreground">{step.time}</div>
                  </div>
                ))}
              </div>
              <Link href="/signup">
                <Button size="lg" className="text-lg px-10 py-7 h-auto">
                  Get Started Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </motion.div>
          </Card>
        </div>
      </section>
    </div>
  );
}
