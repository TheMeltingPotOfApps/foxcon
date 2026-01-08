'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen,
  FileText,
  Video,
  Download,
  ArrowRight,
  Calendar,
  User,
  Clock,
  Tag,
  ExternalLink,
  Play,
  FileCode,
  GraduationCap,
  Lightbulb,
  TrendingUp,
  CheckCircle2
} from 'lucide-react';
import { AnimatedBackground } from '@/components/animated-background';

const resources = [
  {
    category: 'Guides',
    icon: BookOpen,
    color: 'text-blue-500',
    items: [
      {
        title: 'Getting Started with Journey Automation',
        description: 'A comprehensive guide to building your first customer journey',
        type: 'Guide',
        readTime: '15 min',
        date: '2024-01-15',
      },
      {
        title: 'SMS Best Practices for 2024',
        description: 'Learn the latest strategies for effective SMS marketing',
        type: 'Guide',
        readTime: '12 min',
        date: '2024-01-10',
      },
      {
        title: 'PBX Setup and Configuration',
        description: 'Complete walkthrough for setting up your cloud PBX system',
        type: 'Guide',
        readTime: '20 min',
        date: '2024-01-05',
      },
    ],
  },
  {
    category: 'Case Studies',
    icon: TrendingUp,
    color: 'text-green-500',
    items: [
      {
        title: 'How TechFlow Increased Conversions by 3x',
        description: 'Real-world case study showing journey automation results',
        type: 'Case Study',
        readTime: '10 min',
        date: '2024-01-12',
      },
      {
        title: 'RetailMax Recovers $500K in Abandoned Carts',
        description: 'See how automated SMS journeys recovered lost revenue',
        type: 'Case Study',
        readTime: '8 min',
        date: '2024-01-08',
      },
      {
        title: 'Healthcare Provider Reduces No-Shows by 60%',
        description: 'Automated appointment reminders transform patient engagement',
        type: 'Case Study',
        readTime: '12 min',
        date: '2024-01-03',
      },
    ],
  },
  {
    category: 'Tutorials',
    icon: Video,
    color: 'text-purple-500',
    items: [
      {
        title: 'Building Your First Journey - Video Tutorial',
        description: 'Step-by-step video walkthrough of the journey builder',
        type: 'Video',
        readTime: '8 min',
        date: '2024-01-14',
      },
      {
        title: 'Advanced Segmentation Techniques',
        description: 'Learn how to create powerful customer segments',
        type: 'Video',
        readTime: '15 min',
        date: '2024-01-09',
      },
      {
        title: 'API Integration Tutorial',
        description: 'Connect your application with our REST API',
        type: 'Video',
        readTime: '20 min',
        date: '2024-01-04',
      },
    ],
  },
  {
    category: 'API Documentation',
    icon: FileCode,
    color: 'text-orange-500',
    items: [
      {
        title: 'API Reference Guide',
        description: 'Complete API documentation with examples',
        type: 'Documentation',
        readTime: '30 min',
        date: '2024-01-13',
      },
      {
        title: 'Webhook Setup Guide',
        description: 'Configure webhooks to receive real-time events',
        type: 'Documentation',
        readTime: '15 min',
        date: '2024-01-07',
      },
      {
        title: 'SDK Quick Start',
        description: 'Get started with our SDKs for popular languages',
        type: 'Documentation',
        readTime: '10 min',
        date: '2024-01-02',
      },
    ],
  },
];

const quickLinks = [
  {
    title: 'Documentation',
    description: 'Complete product documentation',
    icon: FileText,
    href: '/docs',
    color: 'bg-blue-500',
  },
  {
    title: 'API Reference',
    description: 'REST API documentation',
    icon: FileCode,
    href: '/docs/api',
    color: 'bg-green-500',
  },
  {
    title: 'Video Tutorials',
    description: 'Watch step-by-step guides',
    icon: Video,
    href: '/tutorials',
    color: 'bg-purple-500',
  },
  {
    title: 'Support Center',
    description: 'Get help and support',
    icon: GraduationCap,
    href: '/support',
    color: 'bg-orange-500',
  },
];

export default function ResourcesPage() {
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
            <Badge className="mb-6 px-4 py-1.5 text-sm">Resources & Learning</Badge>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
              Everything You Need to <span className="text-primary">Succeed</span>
            </h1>
            <p className="text-xl sm:text-2xl text-muted-foreground leading-relaxed">
              Guides, tutorials, case studies, and documentation to help you get the most out of our platform
            </p>
          </motion.div>
        </div>
      </section>

      {/* Quick Links */}
      <section className="relative z-10 py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {quickLinks.map((link, idx) => (
              <motion.div
                key={link.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
              >
                <Link href={link.href}>
                  <Card className="h-full hover-lift border-2 cursor-pointer">
                    <CardContent className="p-6 text-center">
                      <div className={`w-12 h-12 ${link.color} rounded-xl flex items-center justify-center mx-auto mb-4`}>
                        <link.icon className="h-6 w-6 text-white" />
                      </div>
                      <h3 className="font-bold mb-2">{link.title}</h3>
                      <p className="text-sm text-muted-foreground">{link.description}</p>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Resources by Category */}
      <section className="relative z-10 py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-24">
            {resources.map((category, categoryIdx) => (
              <motion.div
                key={category.category}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: categoryIdx * 0.1 }}
              >
                <div className="flex items-center gap-3 mb-8">
                  <category.icon className={`h-8 w-8 ${category.color}`} />
                  <h2 className="text-3xl md:text-4xl font-bold">{category.category}</h2>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                  {category.items.map((item, idx) => (
                    <motion.div
                      key={item.title}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: idx * 0.1 }}
                    >
                      <Card className="h-full hover-lift border-2">
                        <CardHeader>
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="secondary">{item.type}</Badge>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {item.readTime}
                            </div>
                          </div>
                          <CardTitle className="text-lg mb-2">{item.title}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <CardDescription className="mb-4">{item.description}</CardDescription>
                          <div className="flex items-center justify-between">
                            <div className="text-xs text-muted-foreground">{item.date}</div>
                            <Button variant="ghost" size="sm">
                              Read More
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 py-24 bg-muted/30">
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
              Start your free trial and explore all our features
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/signup">
                <Button size="lg" className="text-lg px-10 py-7 h-auto">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/docs">
                <Button size="lg" variant="outline" className="text-lg px-10 py-7 h-auto">
                  View Documentation
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

