'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/store/auth-store';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight, Store } from 'lucide-react';
import Image from 'next/image';
import { UnifiedAuth } from '@/lib/auth/unified-auth';
import { toast } from 'sonner';

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasLinkedMarketplace, setHasLinkedMarketplace] = useState(false);
  const [switchingToMarketplace, setSwitchingToMarketplace] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await apiClient.post('/auth/login', {
        email,
        password,
      });

      const { user, accessToken, refreshToken, tenantId } = response.data;
      setAuth(user, accessToken, refreshToken, tenantId);
      
      // Check if user has linked marketplace account
      const linkStatus = await UnifiedAuth.checkLinkedMarketplaceAccount();
      if (linkStatus.linked) {
        setHasLinkedMarketplace(true);
        // Optionally auto-login to marketplace
        const marketplaceLoginSuccess = await UnifiedAuth.loginToMarketplaceFromEngine();
        if (marketplaceLoginSuccess) {
          toast.success('Also logged in to Marketplace');
        }
      }
      
      router.push('/dashboard');
    } catch (err: any) {
      let errorMessage = 'Login failed';
      
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
              errorMessage = 'Login failed. Please check your credentials.';
            }
          } else if (errorData?.error) {
            if (typeof errorData.error === 'string') {
              errorMessage = errorData.error;
            } else {
              errorMessage = 'Login failed. Please check your credentials.';
            }
          } else {
            errorMessage = 'Login failed. Please check your credentials.';
          }
        } else if (err?.message) {
          errorMessage = typeof err.message === 'string' ? err.message : 'Login failed. Please try again.';
        }
      } catch (parseError) {
        // If error parsing fails, use default message
        errorMessage = 'Login failed. Please try again.';
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
          <CardTitle>Login</CardTitle>
          <CardDescription>Enter your credentials to access your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </Button>
            <div className="text-center text-sm">
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="text-primary hover:underline">
                Sign up
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
        className="relative z-10 w-full max-w-md"
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
            <CardTitle className="text-3xl font-bold text-center text-primary">Welcome Back</CardTitle>
            <CardDescription className="text-center text-base">
              Sign in to your account to continue
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
                <label htmlFor="email" className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  Email Address
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  className="h-12 text-base"
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full h-12 text-base font-semibold shadow-glow hover:shadow-glow-accent group" 
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Signing in...
                  </span>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
              
              <div className="text-center text-sm pt-2">
                <span className="text-muted-foreground">Don&apos;t have an account? </span>
                <Link href="/signup" className="font-semibold text-primary hover:text-primary/80 transition-colors">
                  Sign up →
                </Link>
              </div>
              
              {hasLinkedMarketplace && (
                <div className="pt-4 border-t border-border">
                  <p className="text-xs text-center text-muted-foreground mb-2">
                    You also have a Marketplace account
                  </p>
                  <Link href="/marketplace">
                    <Button 
                      type="button"
                      variant="outline" 
                      className="w-full text-sm"
                      onClick={async (e) => {
                        e.preventDefault();
                        setSwitchingToMarketplace(true);
                        const success = await UnifiedAuth.loginToMarketplaceFromEngine();
                        if (success) {
                          router.push('/marketplace');
                        } else {
                          toast.error('Failed to switch to Marketplace');
                          setSwitchingToMarketplace(false);
                        }
                      }}
                      disabled={switchingToMarketplace}
                    >
                      <Store className="h-4 w-4 mr-2" />
                      {switchingToMarketplace ? 'Switching...' : 'Go to Marketplace'}
                    </Button>
                  </Link>
                </div>
              )}
              
              <div className="pt-4 border-t border-border">
                <p className="text-xs text-center text-muted-foreground">
                  Need Marketplace access?{' '}
                  <Link href="/marketplace/login" className="text-primary hover:underline">
                    Sign in to Marketplace
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

