'use client';

import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Book, Code, PlayCircle, FileText, ArrowRight } from 'lucide-react';
import Link from 'next/link';

const docSections = [
  {
    icon: PlayCircle,
    title: 'Getting Started',
    description: 'Learn the basics and set up your first journey',
    links: [
      { text: 'Quick Start Guide', href: '/docs/getting-started' },
      { text: 'Creating Your First Journey', href: '/docs/first-journey' },
      { text: 'Setting Up Calls', href: '/docs/setup-calls' },
    ],
  },
  {
    icon: Book,
    title: 'Journey Builder',
    description: 'Master the visual journey builder and all node types',
    links: [
      { text: 'Journey Builder Overview', href: '/docs/journey-builder' },
      { text: 'Node Types Reference', href: '/docs/node-types' },
      { text: 'Conditional Logic', href: '/docs/conditional-logic' },
      { text: 'Scheduling & Delays', href: '/docs/scheduling' },
    ],
  },
  {
    icon: Code,
    title: 'API Reference',
    description: 'Complete API documentation for developers',
    links: [
      { text: 'Authentication', href: '/docs/api/auth' },
      { text: 'Journeys API', href: '/docs/api/journeys' },
      { text: 'Calls API', href: '/docs/api/calls' },
      { text: 'Webhooks', href: '/docs/api/webhooks' },
    ],
  },
  {
    icon: FileText,
    title: 'Guides & Tutorials',
    description: 'Step-by-step guides for common use cases',
    links: [
      { text: 'Lead Nurturing Journey', href: '/docs/guides/lead-nurturing' },
      { text: 'Appointment Reminders', href: '/docs/guides/appointments' },
      { text: 'Support Automation', href: '/docs/guides/support' },
      { text: 'Best Practices', href: '/docs/guides/best-practices' },
    ],
  },
];

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="border-b border-border/50 py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Documentation & <span className="text-primary">Help</span>
            </h1>
            <p className="text-xl text-muted-foreground">
              Everything you need to get the most out of Nurture Engine
            </p>
          </motion.div>
        </div>
      </section>

      {/* Documentation Sections */}
      <section className="py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {docSections.map((section, idx) => (
              <motion.div
                key={section.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: idx * 0.1 }}
              >
                <Card className="h-full hover-lift">
                  <CardHeader>
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                      <section.icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-xl">{section.title}</CardTitle>
                    <CardDescription className="mt-2">{section.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {section.links.map((link) => (
                        <li key={link.text}>
                          <Link
                            href={link.href}
                            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
                          >
                            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                            {link.text}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Quick Links */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl font-bold mb-4">Popular Articles</h2>
            <p className="text-muted-foreground">Most frequently accessed documentation</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              'Building Your First Journey',
              'Setting Up Call Routing',
              'Using Conditional Logic',
              'API Authentication Guide',
              'Webhook Configuration',
              'Best Practices for Automation',
            ].map((article, idx) => (
              <motion.div
                key={article}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: idx * 0.05 }}
              >
                <Card className="hover-lift cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">{article}</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

