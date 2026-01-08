'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CheckCircle2, ArrowRight, ArrowLeft, Store, ShoppingCart, Users, X } from 'lucide-react';
import {
  useMarketplaceOnboarding,
  useUpdateOnboardingStep,
  useSkipOnboarding,
  useRegisterAsMarketer,
  useRegisterAsBuyer,
  useRegisterAsBoth,
} from '@/lib/hooks/use-marketplace';
import { useRouter } from 'next/navigation';

const onboardingSteps = [
  { id: 'welcome', title: 'Welcome', description: 'Get started with Lead Marketplace' },
  { id: 'choose_role', title: 'Choose Your Role', description: 'Are you a marketer, buyer, or both?' },
  { id: 'marketer_profile', title: 'Marketer Profile', description: 'Set up your marketer profile' },
  { id: 'marketer_integration', title: 'Connect Platforms', description: 'Connect your marketing platforms' },
  { id: 'marketer_first_listing', title: 'Create Listing', description: 'Create your first listing' },
  { id: 'buyer_profile', title: 'Buyer Profile', description: 'Set up your buyer profile' },
  { id: 'buyer_purchase_reservations', title: 'Purchase Reservations', description: 'Buy Lead Reservations' },
  { id: 'buyer_first_subscription', title: 'Subscribe', description: 'Subscribe to your first listing' },
];

export default function MarketplaceOnboardingPage() {
  const router = useRouter();
  const { data: progress, isLoading } = useMarketplaceOnboarding();
  const updateStep = useUpdateOnboardingStep();
  const skipOnboarding = useSkipOnboarding();
  const registerAsMarketer = useRegisterAsMarketer();
  const registerAsBuyer = useRegisterAsBuyer();
  const registerAsBoth = useRegisterAsBoth();

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [selectedRole, setSelectedRole] = useState<'MARKETER' | 'BUYER' | 'BOTH' | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [storefrontSlug, setStorefrontSlug] = useState('');

  useEffect(() => {
    if (progress) {
      if (progress.isCompleted || progress.skipped) {
        router.push('/nurture-leads');
        return;
      }
      const stepIndex = onboardingSteps.findIndex((s) => s.id === progress.currentStep);
      if (stepIndex >= 0) {
        setCurrentStepIndex(stepIndex);
      }
      if (progress.selectedUserType) {
        setSelectedRole(progress.selectedUserType);
      }
    }
  }, [progress, router]);

  const handleNext = async () => {
    const currentStep = onboardingSteps[currentStepIndex];
    let data: any = {};

    if (currentStep.id === 'choose_role') {
      data.userType = selectedRole;
      if (selectedRole === 'MARKETER') {
        await registerAsMarketer.mutateAsync({ companyName: companyName || 'My Company' });
      } else if (selectedRole === 'BUYER') {
        await registerAsBuyer.mutateAsync();
      } else if (selectedRole === 'BOTH') {
        await registerAsBoth.mutateAsync({ companyName: companyName || 'My Company' });
      }
    } else if (currentStep.id === 'marketer_profile') {
      data = { companyName, storefrontSlug };
    }

    await updateStep.mutateAsync({ step: currentStep.id, data });
    setCurrentStepIndex((prev) => Math.min(prev + 1, onboardingSteps.length - 1));
  };

  const handleSkip = async () => {
    await skipOnboarding.mutateAsync();
    router.push('/nurture-leads');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const currentStep = onboardingSteps[currentStepIndex];
  const isLastStep = currentStepIndex === onboardingSteps.length - 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">{currentStep.title}</CardTitle>
              <CardDescription className="mt-2">{currentStep.description}</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={handleSkip}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Step {currentStepIndex + 1} of {onboardingSteps.length}</span>
              <span>{Math.round(((currentStepIndex + 1) / onboardingSteps.length) * 100)}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <motion.div
                className="bg-primary h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${((currentStepIndex + 1) / onboardingSteps.length) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>

          {/* Step Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {currentStep.id === 'welcome' && (
                <div className="space-y-4 text-center py-8">
                  <Store className="h-16 w-16 text-primary mx-auto" />
                  <h3 className="text-xl font-semibold">Welcome to Lead Marketplace!</h3>
                  <p className="text-muted-foreground">
                    Connect with marketers and buyers to buy and sell high-quality leads in real-time.
                  </p>
                </div>
              )}

              {currentStep.id === 'choose_role' && (
                <div className="space-y-4">
                  <Label>What would you like to do?</Label>
                  <RadioGroup value={selectedRole || ''} onValueChange={(v) => setSelectedRole(v as any)}>
                    <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-muted cursor-pointer">
                      <RadioGroupItem value="MARKETER" id="marketer" />
                      <Label htmlFor="marketer" className="flex-1 cursor-pointer">
                        <div className="flex items-center gap-2">
                          <Store className="h-5 w-5" />
                          <div>
                            <div className="font-semibold">Marketer</div>
                            <div className="text-sm text-muted-foreground">Sell leads to buyers</div>
                          </div>
                        </div>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-muted cursor-pointer">
                      <RadioGroupItem value="BUYER" id="buyer" />
                      <Label htmlFor="buyer" className="flex-1 cursor-pointer">
                        <div className="flex items-center gap-2">
                          <ShoppingCart className="h-5 w-5" />
                          <div>
                            <div className="font-semibold">Buyer</div>
                            <div className="text-sm text-muted-foreground">Purchase leads from marketers</div>
                          </div>
                        </div>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-muted cursor-pointer">
                      <RadioGroupItem value="BOTH" id="both" />
                      <Label htmlFor="both" className="flex-1 cursor-pointer">
                        <div className="flex items-center gap-2">
                          <Users className="h-5 w-5" />
                          <div>
                            <div className="font-semibold">Both</div>
                            <div className="text-sm text-muted-foreground">Buy and sell leads</div>
                          </div>
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>
                  {selectedRole && (selectedRole === 'MARKETER' || selectedRole === 'BOTH') && (
                    <div className="space-y-2">
                      <Label htmlFor="companyName">Company Name</Label>
                      <Input
                        id="companyName"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="Enter your company name"
                      />
                    </div>
                  )}
                </div>
              )}

              {currentStep.id === 'marketer_profile' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company Name</Label>
                    <Input
                      id="companyName"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Enter your company name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="storefrontSlug">Storefront URL Slug</Label>
                    <Input
                      id="storefrontSlug"
                      value={storefrontSlug}
                      onChange={(e) => setStorefrontSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      placeholder="my-company"
                    />
                    <p className="text-xs text-muted-foreground">
                      This will be your storefront URL: /storefront/{storefrontSlug || 'your-slug'}
                    </p>
                  </div>
                </div>
              )}

              {(currentStep.id === 'marketer_integration' ||
                currentStep.id === 'marketer_first_listing' ||
                currentStep.id === 'buyer_purchase_reservations' ||
                currentStep.id === 'buyer_first_subscription') && (
                <div className="space-y-4 text-center py-8">
                  <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
                  <h3 className="text-xl font-semibold">Great progress!</h3>
                  <p className="text-muted-foreground">
                    {currentStep.id === 'marketer_integration' &&
                      'You can connect marketing platforms from the Integrations page.'}
                    {currentStep.id === 'marketer_first_listing' &&
                      'You can create your first listing from the Listings page.'}
                    {currentStep.id === 'buyer_purchase_reservations' &&
                      'You can purchase Lead Reservations from the Reservations page.'}
                    {currentStep.id === 'buyer_first_subscription' &&
                      'You can subscribe to listings from the Browse page.'}
                  </p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              onClick={() => setCurrentStepIndex((prev) => Math.max(prev - 1, 0))}
              disabled={currentStepIndex === 0}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={handleSkip}>
                Skip
              </Button>
              <Button
                onClick={handleNext}
                disabled={
                  (currentStep.id === 'choose_role' && !selectedRole) ||
                  (currentStep.id === 'marketer_profile' && !companyName) ||
                  updateStep.isPending ||
                  registerAsMarketer.isPending ||
                  registerAsBuyer.isPending ||
                  registerAsBoth.isPending
                }
              >
                {isLastStep ? 'Complete' : 'Next'}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


