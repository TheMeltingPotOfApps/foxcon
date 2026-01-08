'use client';

import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Workflow, 
  Zap, 
  BarChart3,
  Clock,
  GitBranch,
  Timer,
  Webhook,
  PlayCircle,
  Users,
  Shield,
  TrendingUp,
  Check,
  ArrowRight,
  Phone,
  MessageSquare,
  Sparkles,
  Target,
  Layers,
  Activity,
  Database,
  Cloud,
  Server,
  Lock,
  Award,
  Code,
  Globe,
  CheckCircle2,
  Star,
  Building2,
  ShoppingCart,
  Heart,
  GraduationCap,
  Mail,
  Calendar,
  FileText,
  Settings,
  Bell,
  PieChart,
  LineChart,
  Download,
  Upload,
  Filter,
  Search
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AnimatedBackground } from '@/components/animated-background';
import { JourneyDemo } from '@/components/interactive/journey-demo';
import { ROICalculator } from '@/components/interactive/roi-calculator';
import { FeatureComparison } from '@/components/interactive/feature-comparison';

const journeyFeatures = [
  {
    icon: Workflow,
    title: 'Visual Journey Builder',
    description: 'Drag-and-drop interface to build complex automation workflows without coding. See your entire customer journey at a glance.',
    highlight: 'No coding required',
  },
  {
    icon: GitBranch,
    title: 'Conditional Branching',
    description: 'Create intelligent paths based on customer behavior, responses, or attributes. Every customer gets a personalized experience.',
    highlight: 'Smart routing',
  },
  {
    icon: Timer,
    title: 'Time Delays & Scheduling',
    description: 'Add delays between steps and schedule messages for optimal send times. Respect timezones and customer preferences.',
    highlight: 'Perfect timing',
  },
  {
    icon: Zap,
    title: 'Multi-Channel Automation',
    description: 'Combine SMS, email, and webhooks in a single journey. Reach customers wherever they are.',
    highlight: 'Omnichannel',
  },
  {
    icon: PlayCircle,
    title: 'Entry Criteria',
    description: 'Define who enters your journey based on segments, tags, or attributes. Auto-enroll or manual triggers.',
    highlight: 'Smart targeting',
  },
  {
    icon: BarChart3,
    title: 'Real-Time Analytics',
    description: 'Track every step of your journey with detailed performance metrics. See where customers drop off and optimize.',
    highlight: 'Data-driven',
  },
  {
    icon: Users,
    title: 'Contact Management',
    description: 'Seamlessly integrate with your contact database. Segment, tag, and organize for precise targeting.',
    highlight: 'Powerful CRM',
  },
  {
    icon: Webhook,
    title: 'API & Webhooks',
    description: 'Connect with external systems and trigger actions via webhooks. Full REST API for custom integrations.',
    highlight: 'Extensible',
  },
];

const platformFeatures = [
  {
    icon: Shield,
    title: 'Enterprise Security',
    description: 'Bank-level encryption, SOC 2 compliance, and GDPR-ready. Your data is always protected.',
  },
  {
    icon: TrendingUp,
    title: 'Scalable Infrastructure',
    description: 'Built to handle millions of messages. Auto-scaling infrastructure that grows with your business.',
  },
  {
    icon: Clock,
    title: '99.9% Uptime SLA',
    description: 'Reliable infrastructure with guaranteed uptime. Your journeys run 24/7 without interruption.',
  },
];

export default function FeaturesPage() {
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
            <Badge className="mb-6 px-4 py-1.5 text-sm">Complete Feature Set</Badge>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
              Everything You Need to <span className="text-primary">Automate Customer Journeys</span>
            </h1>
            <p className="text-xl sm:text-2xl text-muted-foreground leading-relaxed">
              Powerful tools designed to help you create, manage, and optimize automation workflows 
              that drive real business results.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Journey Features */}
      <section className="relative z-10 py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-20"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Badge className="mb-4 px-4 py-1.5 text-sm">Journey Automation</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Build Intelligent <span className="text-primary">Customer Journeys</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Create sophisticated automation workflows that adapt to customer behavior and drive conversions
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {journeyFeatures.map((feature, idx) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: idx * 0.05 }}
              >
                <Card className="h-full hover-lift border-2 bg-card/50 backdrop-blur-sm">
                  <CardHeader>
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <feature.icon className="h-6 w-6 text-primary" />
                      </div>
                      <Badge variant="secondary" className="text-xs">{feature.highlight}</Badge>
                    </div>
                    <CardTitle className="text-lg mb-2">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="leading-relaxed">{feature.description}</CardDescription>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Platform Features */}
      <section className="relative z-10 py-32 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Enterprise-Grade <span className="text-primary">Platform</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Built for scale, security, and reliability
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {platformFeatures.map((feature, idx) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: idx * 0.1 }}
              >
                <Card className="h-full hover-lift border-2 text-center p-8">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                    <feature.icon className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* PBX & Call Features */}
      <section className="relative z-10 py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-20"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Badge className="mb-4 px-4 py-1.5 text-sm">Cloud PBX System</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Complete <span className="text-primary">Phone System</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Full-featured PBX with agent portals, call routing, and real-time monitoring
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto mb-16">
            {[
              {
                icon: Phone,
                title: 'WebRTC Softphone',
                description: 'Make and receive calls directly from your browser. No hardware or downloads required.',
                details: ['HD voice quality', 'Works on any device', 'No installation needed', 'Mobile-friendly'],
              },
              {
                icon: Users,
                title: 'Agent Management',
                description: 'Manage your team with role-based access, status tracking, and performance monitoring.',
                details: ['Role-based permissions', 'Status management', 'Performance tracking', 'Team collaboration'],
              },
              {
                icon: GitBranch,
                title: 'Call Routing',
                description: 'Intelligent call routing with queues, IVR, and skill-based distribution.',
                details: ['Smart queues', 'IVR system', 'Skill-based routing', 'Call forwarding'],
              },
              {
                icon: BarChart3,
                title: 'Call Analytics',
                description: 'Comprehensive analytics for call volume, duration, outcomes, and agent performance.',
                details: ['Real-time dashboards', 'Call recordings', 'Performance metrics', 'Custom reports'],
              },
              {
                icon: Activity,
                title: 'Real-Time Monitoring',
                description: 'Monitor live calls, queue status, and agent availability in real-time.',
                details: ['Live call monitoring', 'Queue visibility', 'Agent status', 'Alert system'],
              },
              {
                icon: Shield,
                title: 'Call Recording',
                description: 'Record calls for quality assurance, training, and compliance purposes.',
                details: ['Automatic recording', 'Secure storage', 'Playback interface', 'Compliance ready'],
              },
            ].map((feature, idx) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: idx * 0.05 }}
              >
                <Card className="h-full hover-lift border-2">
                  <CardHeader>
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                      <feature.icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-lg mb-2">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="mb-4">{feature.description}</CardDescription>
                    <ul className="space-y-2">
                      {feature.details.map((detail) => (
                        <li key={detail} className="flex items-start gap-2 text-sm">
                          <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                          <span>{detail}</span>
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

      {/* AI & Automation Features */}
      <section className="relative z-10 py-32 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-20"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Badge className="mb-4 px-4 py-1.5 text-sm">AI-Powered</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Intelligent <span className="text-primary">Automation</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Leverage AI to create better content, optimize journeys, and engage customers intelligently
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {[
              {
                icon: Sparkles,
                title: 'AI Content Generation',
                description: 'Generate SMS content, journey templates, and campaign copy using Claude AI. Save hours of writing time.',
                features: [
                  'Personalized message generation',
                  'Journey template creation',
                  'A/B test variant generation',
                  'Tone and style customization',
                ],
              },
              {
                icon: Target,
                title: 'Smart Segmentation',
                description: 'AI-powered segmentation that automatically groups contacts based on behavior, engagement, and attributes.',
                features: [
                  'Behavioral segmentation',
                  'Predictive scoring',
                  'Dynamic segments',
                  'Auto-updating groups',
                ],
              },
              {
                icon: TrendingUp,
                title: 'Performance Optimization',
                description: 'AI analyzes your campaign performance and suggests improvements to increase conversion rates.',
                features: [
                  'Send time optimization',
                  'Content recommendations',
                  'Journey path suggestions',
                  'Performance predictions',
                ],
              },
              {
                icon: MessageSquare,
                title: 'AI-Assisted Replies',
                description: 'Automatically generate intelligent replies to customer messages using context-aware AI.',
                features: [
                  'Context-aware responses',
                  'Multi-language support',
                  'Sentiment analysis',
                  'Escalation detection',
                ],
              },
            ].map((feature, idx) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, x: idx % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: idx * 0.1 }}
              >
                <Card className="h-full hover-lift border-2">
                  <CardHeader>
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                      <feature.icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-xl mb-2">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="mb-4 text-base">{feature.description}</CardDescription>
                    <ul className="space-y-2">
                      {feature.features.map((item) => (
                        <li key={item} className="flex items-start gap-2">
                          <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                          <span>{item}</span>
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

      {/* Analytics & Reporting */}
      <section className="relative z-10 py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-20"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Badge className="mb-4 px-4 py-1.5 text-sm">Analytics & Reporting</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Data-Driven <span className="text-primary">Insights</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Comprehensive analytics to track performance, optimize campaigns, and make informed decisions
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {[
              {
                icon: PieChart,
                title: 'Journey Analytics',
                description: 'Track every step of your journey with conversion rates, drop-off points, and performance metrics.',
              },
              {
                icon: LineChart,
                title: 'Campaign Performance',
                description: 'Monitor SMS and call campaign performance with real-time metrics and historical trends.',
              },
              {
                icon: BarChart3,
                title: 'Custom Dashboards',
                description: 'Build custom dashboards with the metrics that matter most to your business.',
              },
              {
                icon: Download,
                title: 'Export & Reports',
                description: 'Export data in multiple formats and schedule automated reports for stakeholders.',
              },
              {
                icon: Activity,
                title: 'Real-Time Monitoring',
                description: 'Watch journeys execute in real-time with live updates and instant notifications.',
              },
              {
                icon: Target,
                title: 'ROI Tracking',
                description: 'Measure the return on investment for your automation campaigns with detailed revenue attribution.',
              },
            ].map((feature, idx) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.05 }}
              >
                <Card className="h-full hover-lift border-2">
                  <CardHeader>
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                      <feature.icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-lg mb-2">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Integration & API */}
      <section className="relative z-10 py-32 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-20"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Badge className="mb-4 px-4 py-1.5 text-sm">Integrations & API</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Connect with <span className="text-primary">Your Stack</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Powerful API and pre-built integrations to connect with your existing tools
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <Card className="h-full border-2">
                <CardHeader>
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <Code className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-2xl mb-2">RESTful API</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="mb-4 text-base">
                    Full-featured REST API to integrate our platform with your applications. 
                    Create journeys, send messages, manage contacts, and more programmatically.
                  </CardDescription>
                  <ul className="space-y-2 mb-6">
                    {[
                      'Comprehensive API documentation',
                      'Rate limiting and quotas',
                      'Webhook support',
                      'OAuth 2.0 authentication',
                      'SDKs for popular languages',
                      'Postman collection',
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href="/docs">
                    <Button variant="outline" className="w-full">
                      View API Documentation
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <Card className="h-full border-2">
                <CardHeader>
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <Webhook className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-2xl mb-2">Pre-Built Integrations</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="mb-4 text-base">
                    Connect with popular platforms and tools without writing code. 
                    Set up integrations in minutes and start automating.
                  </CardDescription>
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    {[
                      'Twilio', 'Stripe', 'Salesforce', 'HubSpot',
                      'Zapier', 'Make', 'Shopify', 'WooCommerce',
                      'WordPress', 'Slack', 'Microsoft Teams', 'Google Workspace',
                    ].map((integration) => (
                      <div key={integration} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        <span className="text-sm">{integration}</span>
                      </div>
                    ))}
                  </div>
                  <Link href="/integrations">
                    <Button variant="outline" className="w-full">
                      Browse All Integrations
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Interactive Demo Section */}
      <section className="relative z-10 py-32">
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
              See It <span className="text-primary">In Action</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Experience our journey builder with an interactive demo
            </p>
          </motion.div>
          <div className="max-w-4xl mx-auto">
            <JourneyDemo />
          </div>
        </div>
      </section>

      {/* Feature Comparison */}
      <section className="relative z-10 py-32 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Badge className="mb-4 px-4 py-1.5 text-sm">Compare</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              See How We <span className="text-primary">Compare</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Compare our features against the competition
            </p>
          </motion.div>
          <div className="max-w-6xl mx-auto">
            <FeatureComparison />
          </div>
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
              Ready to Build Your First Journey?
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Start your free trial and experience the power of journey automation. 
              No credit card required.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/signup">
                <Button size="lg" className="text-lg px-10 py-7 h-auto">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/book-a-call">
                <Button size="lg" variant="outline" className="text-lg px-10 py-7 h-auto">
                  Book a Demo
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
