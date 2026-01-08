'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  Users, 
  MessageSquare, 
  Clock, 
  ShoppingCart,
  GraduationCap,
  Heart,
  Building2,
  ArrowRight,
  Check,
  BarChart3
} from 'lucide-react';
import { AnimatedBackground } from '@/components/animated-background';

const useCases = [
  {
    icon: ShoppingCart,
    title: 'E-commerce & Retail',
    industry: 'Retail',
    challenge: 'Cart abandonment and low conversion rates',
    solution: 'Automated follow-up sequences that recover abandoned carts and drive purchases',
    results: [
      '35% reduction in cart abandonment',
      '2.5x increase in conversion rate',
      'Automated order confirmations and shipping updates',
    ],
    journey: [
      'Abandoned cart detected',
      'Reminder SMS after 1 hour',
      'Special offer after 24 hours',
      'Final reminder after 48 hours',
      'Post-purchase follow-up',
    ],
  },
  {
    icon: Building2,
    title: 'Real Estate',
    industry: 'Real Estate',
    challenge: 'Lead nurturing and appointment scheduling',
    solution: 'Automated lead nurturing with property alerts and appointment reminders',
    results: [
      '40% increase in showings scheduled',
      '3x faster lead response time',
      'Automated property matching',
    ],
    journey: [
      'New lead captured',
      'Welcome message with property matches',
      'Property alert based on preferences',
      'Appointment reminder',
      'Follow-up after showing',
    ],
  },
  {
    icon: GraduationCap,
    title: 'Education',
    industry: 'Education',
    challenge: 'Student engagement and enrollment',
    solution: 'Automated enrollment journeys that guide students through the process',
    results: [
      '50% increase in enrollment completion',
      'Reduced administrative workload',
      'Improved student satisfaction',
    ],
    journey: [
      'Application received',
      'Welcome and next steps',
      'Document reminder',
      'Orientation information',
      'First day preparation',
    ],
  },
  {
    icon: Heart,
    title: 'Healthcare',
    industry: 'Healthcare',
    challenge: 'Patient engagement and appointment compliance',
    solution: 'Automated appointment reminders and health check-ins',
    results: [
      '60% reduction in no-shows',
      'Improved patient outcomes',
      'Better medication adherence',
    ],
    journey: [
      'Appointment scheduled',
      'Reminder 48 hours before',
      'Final reminder 24 hours before',
      'Post-appointment follow-up',
      'Health check-in',
    ],
  },
  {
    icon: TrendingUp,
    title: 'Sales & Lead Generation',
    industry: 'Sales',
    challenge: 'Lead qualification and follow-up',
    solution: 'Automated lead nurturing sequences that qualify and convert',
    results: [
      '3x conversion rate improvement',
      'Faster sales cycle',
      'Better lead qualification',
    ],
    journey: [
      'Lead captured',
      'Initial qualification',
      'Value proposition',
      'Case study and social proof',
      'Demo offer and close',
    ],
  },
  {
    icon: Users,
    title: 'Customer Support',
    industry: 'Support',
    challenge: 'Ticket management and customer satisfaction',
    solution: 'Automated support workflows that route and resolve issues faster',
    results: [
      '50% faster resolution time',
      'Higher customer satisfaction',
      'Reduced support costs',
    ],
    journey: [
      'Support ticket created',
      'Auto-categorization',
      'Status updates',
      'Resolution confirmation',
      'Satisfaction survey',
    ],
  },
];

export default function UseCasesPage() {
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
            <Badge className="mb-6 px-4 py-1.5 text-sm">Real-World Applications</Badge>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
              Journey Automation for <span className="text-primary">Every Industry</span>
            </h1>
            <p className="text-xl sm:text-2xl text-muted-foreground leading-relaxed">
              See how businesses across industries use journey automation to drive growth, 
              improve efficiency, and delight customers.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="relative z-10 py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-24 max-w-6xl mx-auto">
            {useCases.map((useCase, idx) => (
              <motion.div
                key={useCase.title}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: idx * 0.1 }}
                className="grid lg:grid-cols-2 gap-12 items-center"
              >
                <div className={idx % 2 === 0 ? '' : 'lg:order-2'}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                      <useCase.icon className="h-7 w-7 text-primary" />
                    </div>
                    <div>
                      <Badge variant="secondary" className="mb-1">{useCase.industry}</Badge>
                      <h2 className="text-3xl md:text-4xl font-bold">{useCase.title}</h2>
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-2 text-muted-foreground">The Challenge</h3>
                      <p className="text-muted-foreground">{useCase.challenge}</p>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-semibold mb-2 text-muted-foreground">The Solution</h3>
                      <p className="text-foreground leading-relaxed">{useCase.solution}</p>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-4">Results</h3>
                      <ul className="space-y-2">
                        {useCase.results.map((result) => (
                          <li key={result} className="flex items-start gap-3">
                            <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                            <span className="text-foreground">{result}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                <div className={idx % 2 === 0 ? 'lg:order-2' : ''}>
                  <Card className="border-2 shadow-xl">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-primary" />
                        Journey Flow
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {useCase.journey.map((step, stepIdx) => (
                          <div key={stepIdx} className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 text-sm font-bold text-primary">
                              {stepIdx + 1}
                            </div>
                            <div className="flex-1">
                              <div className="font-medium">{step}</div>
                              {stepIdx < useCase.journey.length - 1 && (
                                <div className="h-6 w-0.5 bg-primary/20 ml-5 mt-1"></div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 py-32 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Ready to Transform Your Business?
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Start building your first journey today. No credit card required.
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
