'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api/client';

interface LeadFunnelFormProps {
  endpointKey: string;
  title?: string;
  description?: string;
  fields?: Array<{
    name: string;
    label: string;
    type?: 'text' | 'email' | 'phone';
    required?: boolean;
    placeholder?: string;
  }>;
  onSuccess?: () => void;
  className?: string;
}

const defaultFields = [
  { name: 'firstName', label: 'First Name', type: 'text' as const, required: true, placeholder: 'John' },
  { name: 'lastName', label: 'Last Name', type: 'text' as const, required: true, placeholder: 'Doe' },
  { name: 'email', label: 'Email', type: 'email' as const, required: true, placeholder: 'john@example.com' },
  { name: 'phone', label: 'Phone', type: 'phone' as const, required: false, placeholder: '+1234567890' },
];

export function LeadFunnelForm({
  endpointKey,
  title = 'Get Started Today',
  description = 'Fill out the form below and we&apos;ll get back to you soon.',
  fields = defaultFields,
  onSuccess,
  className = '',
}: LeadFunnelFormProps) {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await apiClient.post(`/ingest/${endpointKey}`, formData);
      setIsSuccess(true);
      toast.success('Thank you! We&apos;ll be in touch soon.');
      if (onSuccess) {
        onSuccess();
      }
      // Reset form after 2 seconds
      setTimeout(() => {
        setIsSuccess(false);
        setFormData({});
      }, 2000);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  if (isSuccess) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center py-8"
          >
            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-success" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Thank You!</h3>
            <p className="text-muted-foreground">We&apos;ve received your information and will be in touch soon.</p>
          </motion.div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.map((field) => (
            <div key={field.name} className="space-y-2">
              <label htmlFor={field.name} className="text-sm font-medium">
                {field.label}
                {field.required && <span className="text-destructive ml-1">*</span>}
              </label>
              <Input
                id={field.name}
                name={field.name}
                type={field.type === 'phone' ? 'tel' : field.type || 'text'}
                required={field.required}
                placeholder={field.placeholder}
                value={formData[field.name] || ''}
                onChange={(e) => handleChange(field.name, e.target.value)}
                className="h-11"
              />
            </div>
          ))}
          <Button
            type="submit"
            className="w-full h-11"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

