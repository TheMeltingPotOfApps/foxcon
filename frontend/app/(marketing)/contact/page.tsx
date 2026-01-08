'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mail, Phone, MapPin, Loader2, Check, MessageSquare, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { LeadFunnelForm } from '@/components/lead-funnel-form';
import { AnimatedBackground } from '@/components/animated-background';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // In a real app, you'd send this to your API
      await new Promise(resolve => setTimeout(resolve, 1000));
      setIsSuccess(true);
      toast.success('Thank you! We&apos;ll be in touch soon.');
      setFormData({ name: '', email: '', company: '', phone: '', message: '' });
    } catch (error) {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

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
            <Badge className="mb-6 px-4 py-1.5 text-sm">Get in Touch</Badge>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
              Let&apos;s Start a <span className="text-primary">Conversation</span>
            </h1>
            <p className="text-xl sm:text-2xl text-muted-foreground leading-relaxed">
              Have questions about journey automation? We&apos;d love to hear from you and help you get started.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Contact Form & Info */}
      <section className="relative z-10 py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <Card className="border-2 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-2xl">Send us a Message</CardTitle>
                  <CardDescription className="text-base">
                    Fill out the form below and we&apos;ll get back to you within 24 hours
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isSuccess ? (
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-center py-12"
                    >
                      <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
                        <Check className="h-10 w-10 text-success" />
                      </div>
                      <h3 className="text-2xl font-semibold mb-2">Message Sent!</h3>
                      <p className="text-muted-foreground text-lg">
                        We&apos;ve received your message and will respond soon.
                      </p>
                    </motion.div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-5">
                      <div className="grid md:grid-cols-2 gap-5">
                        <div className="space-y-2">
                          <label htmlFor="name" className="text-sm font-medium">Name *</label>
                          <Input
                            id="name"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="h-11"
                          />
                        </div>
                        <div className="space-y-2">
                          <label htmlFor="email" className="text-sm font-medium">Email *</label>
                          <Input
                            id="email"
                            type="email"
                            required
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="h-11"
                          />
                        </div>
                      </div>
                      <div className="grid md:grid-cols-2 gap-5">
                        <div className="space-y-2">
                          <label htmlFor="company" className="text-sm font-medium">Company</label>
                          <Input
                            id="company"
                            value={formData.company}
                            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                            className="h-11"
                          />
                        </div>
                        <div className="space-y-2">
                          <label htmlFor="phone" className="text-sm font-medium">Phone</label>
                          <Input
                            id="phone"
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            className="h-11"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="message" className="text-sm font-medium">Message *</label>
                        <Textarea
                          id="message"
                          required
                          rows={6}
                          value={formData.message}
                          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                          className="resize-none"
                        />
                      </div>
                      <Button type="submit" className="w-full h-12 text-base" disabled={isSubmitting}>
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <MessageSquare className="mr-2 h-5 w-5" />
                            Send Message
                          </>
                        )}
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Contact Info */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="space-y-6"
            >
              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="text-xl">Contact Information</CardTitle>
                  <CardDescription>Reach out to us through any of these channels</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Mail className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1 text-lg">Email</h3>
                      <p className="text-muted-foreground">support@nurtureengine.net</p>
                      <p className="text-muted-foreground">sales@nurtureengine.net</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Phone className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1 text-lg">Phone</h3>
                      <p className="text-muted-foreground">+1 (555) 123-4567</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <Clock className="h-4 w-4" />
                        Mon-Fri, 9am-5pm EST
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <MapPin className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1 text-lg">Office</h3>
                      <p className="text-muted-foreground">123 Business Street</p>
                      <p className="text-muted-foreground">San Francisco, CA 94105</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="text-xl">Sales Inquiry</CardTitle>
                  <CardDescription>Interested in enterprise features or a custom solution?</CardDescription>
                </CardHeader>
                <CardContent>
                  <LeadFunnelForm
                    endpointKey="sales-inquiry"
                    title="Request a Demo"
                    description="Schedule a personalized demo with our sales team"
                    fields={[
                      { name: 'firstName', label: 'First Name', type: 'text', required: true },
                      { name: 'lastName', label: 'Last Name', type: 'text', required: true },
                      { name: 'email', label: 'Email', type: 'email', required: true },
                      { name: 'company', label: 'Company', type: 'text', required: false },
                      { name: 'phone', label: 'Phone', type: 'phone', required: false },
                    ]}
                  />
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}
