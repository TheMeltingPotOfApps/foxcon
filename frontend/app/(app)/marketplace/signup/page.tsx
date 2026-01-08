'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { marketplaceApiClient } from '@/lib/api/marketplace-client';
import { useMarketplaceAuthStore } from '@/store/marketplace-auth-store';
import { motion } from 'framer-motion';
import { Mail, Lock, User, Building2, ArrowRight, Check } from 'lucide-react';

export default function MarketplaceSignupPage() {
  const router = useRouter();
  const setAuth = useMarketplaceAuthStore((state) => state.setAuth);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    userType: 'BOTH' as 'MARKETER' | 'BUYER' | 'BOTH',
    companyName: '',
    storefrontSlug: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await marketplaceApiClient.post('/marketplace/auth/signup', {
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        userType: formData.userType,
        companyName: formData.companyName || undefined,
        storefrontSlug: formData.storefrontSlug || undefined,
      });

      const { user, accessToken, refreshToken } = response.data;
      setAuth(user, accessToken, refreshToken);
      router.push('/marketplace/onboarding');
    } catch (err: any) {
      let errorMessage = 'Signup failed';
      
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
        errorMessage = 'Signup failed. Please try again.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

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
            <CardTitle className="text-3xl font-bold text-center text-primary">Join Marketplace</CardTitle>
            <CardDescription className="text-center text-base">
              Create your marketplace account to buy and sell leads
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
              
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Account Type</Label>
                <RadioGroup
                  value={formData.userType}
                  onValueChange={(value) => setFormData({ ...formData, userType: value as any })}
                  className="grid grid-cols-3 gap-4"
                >
                  <div>
                    <RadioGroupItem value="MARKETER" id="marketer" className="peer sr-only" />
                    <Label
                      htmlFor="marketer"
                      className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                    >
                      <span className="text-sm font-medium">Marketer</span>
                      <span className="text-xs text-muted-foreground mt-1">Sell leads</span>
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem value="BUYER" id="buyer" className="peer sr-only" />
                    <Label
                      htmlFor="buyer"
                      className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                    >
                      <span className="text-sm font-medium">Buyer</span>
                      <span className="text-xs text-muted-foreground mt-1">Buy leads</span>
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem value="BOTH" id="both" className="peer sr-only" />
                    <Label
                      htmlFor="both"
                      className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                    >
                      <span className="text-sm font-medium">Both</span>
                      <span className="text-xs text-muted-foreground mt-1">Buy & sell</span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
              
              {(formData.userType === 'MARKETER' || formData.userType === 'BOTH') && (
                <div className="space-y-2">
                  <label htmlFor="companyName" className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    Company Name
                  </label>
                  <Input
                    id="companyName"
                    placeholder="Acme Inc"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    className="h-12 text-base"
                  />
                </div>
              )}
              
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
                  placeholder="At least 8 characters"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  className="h-12 text-base"
                />
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Check className="h-3 w-3" />
                  Minimum 8 characters
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
                <Link href="/marketplace/login" className="font-semibold text-primary hover:text-primary/80 transition-colors">
                  Sign in →
                </Link>
              </div>
              
              <div className="pt-4 border-t border-border">
                <p className="text-xs text-center text-muted-foreground">
                  Have an Engine account?{' '}
                  <Link href="/signup" className="text-primary hover:underline">
                    Sign up for Engine
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

