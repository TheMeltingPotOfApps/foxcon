'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/store/auth-store';
import { motion } from 'framer-motion';
import { Mail, Lock, User, Building2, ArrowRight, Check } from 'lucide-react';
import Image from 'next/image';

export default function SignupPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    tenantName: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await apiClient.post('/auth/signup', formData);

      const { user, accessToken, refreshToken, tenantId } = response.data;
      setAuth(user, accessToken, refreshToken, tenantId);
      // Redirect to dashboard - onboarding will show automatically
      router.push('/dashboard');
    } catch (err: any) {
      let errorMessage = 'Signup failed';
      
      try {
        if (err?.response?.data) {
          const errorData = err.response.data;
          // Handle different error response formats
          if (typeof errorData === 'string') {
            errorMessage = errorData;
          } else if (errorData?.message) {
            // Handle array of messages (NestJS validation errors)
            if (Array.isArray(errorData.message)) {
              errorMessage = errorData.message.join(', ');
            } else if (typeof errorData.message === 'string') {
              errorMessage = errorData.message;
            } else {
              errorMessage = 'Signup failed. Please check your information.';
            }
          } else if (errorData?.error) {
            if (typeof errorData.error === 'string') {
              errorMessage = errorData.error;
            } else {
              errorMessage = 'Signup failed. Please check your information.';
            }
          } else {
            errorMessage = 'Signup failed. Please check your information.';
          }
        } else if (err?.message) {
          errorMessage = typeof err.message === 'string' ? err.message : 'Signup failed. Please try again.';
        }
      } catch (parseError) {
        // If error parsing fails, use default message
        errorMessage = 'Signup failed. Please try again.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // ===== ORIGINAL CONTENT (COMMENTED OUT) =====
  /*
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign Up</CardTitle>
          <CardDescription>Create your account and workspace</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <label htmlFor="tenantName" className="text-sm font-medium">
                Company/Workspace Name
              </label>
              <Input
                id="tenantName"
                placeholder="Acme Inc"
                value={formData.tenantName}
                onChange={(e) => setFormData({ ...formData, tenantName: e.target.value })}
                autoComplete="organization"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="firstName" className="text-sm font-medium">
                  First Name
                </label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  autoComplete="given-name"
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="lastName" className="text-sm font-medium">
                  Last Name
                </label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  autoComplete="family-name"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                autoComplete="email"
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                autoComplete="new-password"
                required
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating account...' : 'Sign Up'}
            </Button>
            <div className="text-center text-sm">
              Already have an account?{' '}
              <Link href="/login" className="text-primary hover:underline">
                Login
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
  */

  // ===== NEW MODERN REDESIGN =====
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse-soft"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse-soft" style={{ animationDelay: '1s' }}></div>
      </div>

      <motion.div
        className="relative z-10 w-full max-w-lg"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="glass border-border/50 shadow-xl-modern">
          <CardHeader className="space-y-3 pb-6">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary mx-auto mb-2">
              <Image 
                src="/engine-logo.svg" 
                alt="Engine Logo" 
                width={32} 
                height={32}
                className="h-8 w-8"
              />
            </div>
            <CardTitle className="text-3xl font-bold text-center text-primary">Create Account</CardTitle>
            <CardDescription className="text-center text-base">
              Start your journey with our platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="rounded-xl bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive flex items-center gap-2"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-destructive"></div>
                  {error}
                </motion.div>
              )}
              
              <div className="space-y-2">
                <label htmlFor="tenantName" className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  Company/Workspace Name
                </label>
                <Input
                  id="tenantName"
                  placeholder="Acme Inc"
                  value={formData.tenantName}
                  onChange={(e) => setFormData({ ...formData, tenantName: e.target.value })}
                  autoComplete="organization"
                  required
                  className="h-12 text-base"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="firstName" className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    First Name
                  </label>
                  <Input
                    id="firstName"
                    placeholder="John"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    autoComplete="given-name"
                    required
                    className="h-12 text-base"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="lastName" className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    Last Name
                  </label>
                  <Input
                    id="lastName"
                    placeholder="Doe"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    autoComplete="family-name"
                    required
                    className="h-12 text-base"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  Email Address
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  autoComplete="email"
                  required
                  className="h-12 text-base"
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  placeholder="At least 6 characters"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  autoComplete="new-password"
                  required
                  minLength={6}
                  className="h-12 text-base"
                />
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Check className="h-3 w-3" />
                  Minimum 6 characters
                </p>
              </div>
              
              <Button 
                type="submit" 
                className="w-full h-12 text-base font-semibold shadow-glow hover:shadow-glow-accent group" 
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Creating account...
                  </span>
                ) : (
                  <>
                    Create Account
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
              
              <div className="text-center text-sm pt-2">
                <span className="text-muted-foreground">Already have an account? </span>
                <Link href="/login" className="font-semibold text-primary hover:text-primary/80 transition-colors">
                  Sign in →
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

