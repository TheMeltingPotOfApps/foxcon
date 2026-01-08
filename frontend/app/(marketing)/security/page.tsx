'use client';

import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Lock, Eye, FileCheck, Server, CheckCircle } from 'lucide-react';

const securityFeatures = [
  {
    icon: Lock,
    title: 'End-to-End Encryption',
    description: 'All data is encrypted in transit and at rest using industry-standard encryption protocols.',
  },
  {
    icon: Shield,
    title: 'SOC 2 Compliant',
    description: 'We maintain SOC 2 Type II compliance and undergo regular security audits.',
  },
  {
    icon: Server,
    title: 'Secure Infrastructure',
    description: 'Hosted on enterprise-grade cloud infrastructure with 99.9% uptime SLA.',
  },
  {
    icon: Eye,
    title: 'Access Controls',
    description: 'Role-based access control and multi-factor authentication to protect your account.',
  },
  {
    icon: FileCheck,
    title: 'GDPR & CCPA Compliant',
    description: 'Full compliance with GDPR, CCPA, and other data protection regulations.',
  },
  {
    icon: CheckCircle,
    title: 'Regular Audits',
    description: 'Regular security audits and penetration testing to ensure ongoing protection.',
  },
];

const complianceStandards = [
  'SOC 2 Type II',
  'GDPR',
  'CCPA',
  'HIPAA Ready',
  'PCI DSS Level 1',
  'ISO 27001',
];

export default function SecurityPage() {
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
              Security & <span className="text-primary">Compliance</span>
            </h1>
            <p className="text-xl text-muted-foreground">
              Enterprise-grade security to protect your data and your customers
            </p>
          </motion.div>
        </div>
      </section>

      {/* Security Features */}
      <section className="py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Security Features</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Multiple layers of security to keep your data safe
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {securityFeatures.map((feature, idx) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: idx * 0.1 }}
              >
                <Card className="h-full hover-lift">
                  <CardHeader>
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                      <feature.icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
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

      {/* Compliance */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Compliance Standards</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              We meet the highest standards for data protection and security
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-4 max-w-5xl mx-auto">
            {complianceStandards.map((standard, idx) => (
              <motion.div
                key={standard}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: idx * 0.05 }}
              >
                <Card className="text-center hover-lift">
                  <CardContent className="p-6">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <CheckCircle className="h-5 w-5 text-primary" />
                    </div>
                    <p className="font-semibold text-sm">{standard}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Data Protection */}
      <section className="py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="prose prose-lg dark:prose-invert mx-auto"
            >
              <h2 className="text-3xl font-bold mb-6">Data Protection</h2>
              <p className="text-muted-foreground mb-4">
                We take data protection seriously. All customer data is encrypted, access is logged 
                and audited, and we never share your data with third parties without your explicit consent.
              </p>
              <p className="text-muted-foreground mb-4">
                Our infrastructure is designed with security as a first principle, with regular 
                security audits, penetration testing, and compliance certifications.
              </p>
              <p className="text-muted-foreground">
                For enterprise customers, we offer additional security features including single 
                sign-on (SSO), IP whitelisting, and dedicated security reviews.
              </p>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}

