'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Check, Loader2, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { AnimatedBackground } from '@/components/animated-background';
import { apiClient } from '@/lib/api/client';

const timeSlots = [
  '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM',
  '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM', '5:00 PM',
];

export default function BookACallPage() {
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDate || !selectedTime) {
      toast.error('Please select a date and time');
      return;
    }

    setIsSubmitting(true);

    try {
      const startTime = new Date(`${selectedDate}T${selectedTime}`);
      const endTime = new Date(startTime.getTime() + 30 * 60000); // 30 minutes

      await apiClient.post('/calendar/events', {
        title: `Call with ${formData.name}`,
        description: formData.message,
        type: 'SALES_CALL',
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        attendeeName: formData.name,
        attendeeEmail: formData.email,
        attendeePhone: formData.phone,
        attendeeCompany: formData.company,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });

      setIsSuccess(true);
      toast.success('Call scheduled successfully! We&apos;ll send you a confirmation email.');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to schedule call. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  const getMaxDate = () => {
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 30);
    return maxDate.toISOString().split('T')[0];
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
            <Badge className="mb-6 px-4 py-1.5 text-sm">Schedule a Call</Badge>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
              Let&apos;s Talk About Your <span className="text-primary">Journey Automation</span>
            </h1>
            <p className="text-xl sm:text-2xl text-muted-foreground leading-relaxed">
              Book a personalized demo call with our team. We&apos;ll show you how to automate customer journeys and drive growth.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Booking Form */}
      <section className="relative z-10 py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            {isSuccess ? (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-center"
              >
                <Card className="border-2 shadow-xl">
                  <CardContent className="p-12">
                    <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
                      <Check className="h-10 w-10 text-success" />
                    </div>
                    <h2 className="text-3xl font-bold mb-4">Call Scheduled!</h2>
                    <p className="text-lg text-muted-foreground mb-6">
                      We&apos;ve scheduled your call for{' '}
                      <span className="font-semibold text-foreground">
                        {new Date(`${selectedDate}T${selectedTime}`).toLocaleString()}
                      </span>
                    </p>
                    <p className="text-muted-foreground">
                      You&apos;ll receive a confirmation email with meeting details shortly.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <Card className="border-2 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <Phone className="h-6 w-6 text-primary" />
                    Schedule Your Call
                  </CardTitle>
                  <CardDescription className="text-base">
                    Choose a date and time that works for you
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Date Selection */}
                    <div>
                      <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-primary" />
                        Select Date
                      </label>
                      <Input
                        type="date"
                        required
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        min={getMinDate()}
                        max={getMaxDate()}
                        className="h-12"
                      />
                    </div>

                    {/* Time Selection */}
                    {selectedDate && (
                      <div>
                        <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                          <Clock className="h-4 w-4 text-primary" />
                          Select Time (30 min slots)
                        </label>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                          {timeSlots.map((time) => (
                            <button
                              key={time}
                              type="button"
                              onClick={() => setSelectedTime(time)}
                              className={`h-12 rounded-lg border-2 transition-all ${
                                selectedTime === time
                                  ? 'border-primary bg-primary/10 text-primary font-semibold'
                                  : 'border-border hover:border-primary/50'
                              }`}
                            >
                              {time}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Contact Information */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label htmlFor="name" className="text-sm font-medium">
                          Full Name *
                        </label>
                        <Input
                          id="name"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="h-11"
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="email" className="text-sm font-medium">
                          Email *
                        </label>
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

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label htmlFor="phone" className="text-sm font-medium">
                          Phone Number *
                        </label>
                        <Input
                          id="phone"
                          type="tel"
                          required
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="h-11"
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="company" className="text-sm font-medium">
                          Company
                        </label>
                        <Input
                          id="company"
                          value={formData.company}
                          onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                          className="h-11"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="message" className="text-sm font-medium">
                        What would you like to discuss?
                      </label>
                      <Textarea
                        id="message"
                        rows={4}
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        placeholder="Tell us about your use case or any questions you have..."
                        className="resize-none"
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-12 text-base"
                      disabled={isSubmitting || !selectedDate || !selectedTime}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Scheduling...
                        </>
                      ) : (
                        <>
                          <Calendar className="mr-2 h-5 w-5" />
                          Schedule Call
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

