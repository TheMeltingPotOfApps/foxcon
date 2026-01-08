'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/store/auth-store';
import { motion } from 'framer-motion';
import { Lock, ArrowRight, Check, Mail } from 'lucide-react';

function CompleteSignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((state) => state.setAuth);
  
  const [formData, setFormData] = useState({
    email: '',
    token: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Get token and email from URL parameters
    const token = searchParams.get('token');
    const email = searchParams.get('email');
    
    if (token && email) {
      setFormData((prev) => ({
        ...prev,
        token,
        email: decodeURIComponent(email),
      }));
    } else {
      setError('Invalid signup link. Please check your SMS message.');
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password length
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (!formData.token || !formData.email) {
      setError('Missing signup information. Please use the link from your SMS.');
      return;
    }

    setLoading(true);

    try {
      const response = await apiClient.post('/auth/complete-signup', {
        email: formData.email,
        token: formData.token,
        password: formData.password,
      });

      const { user, accessToken, refreshToken, tenantId } = response.data;
      setAuth(user, accessToken, refreshToken, tenantId);
      // Redirect to dashboard
      router.push('/dashboard');
    } catch (err: any) {
      let errorMessage = 'Failed to complete signup';
      
      try {
        if (err?.response?.data) {
          const errorData = err.response.data;
          if (typeof errorData === 'string') {
            errorMessage = errorData;
          } else if (errorData?.message) {
            if (Array.isArray(errorData.message)) {
              errorMessage = errorData.message.join(', ');
            } else if (typeof errorData.message === 'string') {
              errorMessage = errorData.message;
            }
          } else if (errorData?.error) {
            if (typeof errorData.error === 'string') {
              errorMessage = errorData.error;
            }
          }
        } else if (err?.message) {
          errorMessage = typeof err.message === 'string' ? err.message : 'Failed to complete signup';
        }
      } catch (parseError) {
        errorMessage = 'Failed to complete signup. Please try again.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="shadow-xl border-0">
          <CardHeader className="space-y-1 text-center pb-6">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Check className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">Complete Your Signup</CardTitle>
            <CardDescription>
              Set your password to finish creating your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-md bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20"
                >
                  {error}
                </motion.div>
              )}

              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  disabled
                  className="bg-muted"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  New Password
                </label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, password: e.target.value }))
                  }
                  required
                  minLength={8}
                />
                <p className="text-xs text-muted-foreground">
                  Must be at least 8 characters long
                </p>
              </div>

              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-medium flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Confirm Password
                </label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, confirmPassword: e.target.value }))
                  }
                  required
                  minLength={8}
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loading || !formData.token || !formData.email}
              >
                {loading ? (
                  'Completing Signup...'
                ) : (
                  <>
                    Complete Signup
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>

              <div className="text-center text-sm text-muted-foreground">
                <p>
                  Already have an account?{' '}
                  <Link href="/login" className="text-primary hover:underline font-medium">
                    Sign in
                  </Link>
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

export default function CompleteSignupPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">Loading...</div>
          </CardContent>
        </Card>
      </div>
    }>
      <CompleteSignupForm />
    </Suspense>
  );
}
