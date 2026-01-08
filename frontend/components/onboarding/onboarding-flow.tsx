'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
// Simple progress bar component
const Progress = ({ value, className }: { value: number; className?: string }) => (
  <div className={`relative h-2 w-full overflow-hidden rounded-full bg-secondary ${className || ''}`}>
    <div
      className="h-full bg-primary transition-all duration-300"
      style={{ width: `${value}%` }}
    />
  </div>
);
import {
  useOnboardingProgress,
  useCompleteOnboardingStep,
  useSkipOnboarding,
  OnboardingStep,
} from '@/lib/hooks/use-onboarding';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  Phone,
  Users,
  FileText,
  Megaphone,
  MessageSquare,
  CheckCircle2,
  X,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';

const stepConfig = {
  [OnboardingStep.WELCOME]: {
    title: 'Welcome to NurtureEngine! 🎉',
    description: "Let&apos;s get you set up in just a few steps",
    icon: Sparkles,
    content: (
      <div className="space-y-4">
        <p className="text-muted-foreground">
          We&apos;ll guide you through connecting your SMS provider, adding contacts, and creating your first campaign.
        </p>
        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="p-4 border rounded-lg">
            <div className="text-2xl font-bold text-primary">5 min</div>
            <div className="text-sm text-muted-foreground">Setup time</div>
          </div>
          <div className="p-4 border rounded-lg">
            <div className="text-2xl font-bold text-primary">6 steps</div>
            <div className="text-sm text-muted-foreground">To get started</div>
          </div>
        </div>
      </div>
    ),
  },
  [OnboardingStep.CONNECT_TWILIO]: {
    title: 'Connect Your SMS Provider',
    description: 'Connect Twilio to start sending messages',
    icon: Phone,
    content: (
      <div className="space-y-4">
        <p className="text-muted-foreground">
          Connect your Twilio account to enable SMS messaging. You&apos;ll need your Account SID and Auth Token.
        </p>
        <Link href="/settings?tab=twilio">
          <Button className="w-full">
            Go to Twilio Settings
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
        <p className="text-xs text-muted-foreground text-center">
          Once connected, come back here to continue
        </p>
      </div>
    ),
  },
  [OnboardingStep.ADD_CONTACTS]: {
    title: 'Add Your First Contacts',
    description: 'Import contacts to start messaging',
    icon: Users,
    content: (
      <div className="space-y-4">
        <p className="text-muted-foreground">
          Add contacts manually or import from a CSV file. You can also create segments to organize your audience.
        </p>
        <Link href="/contacts">
          <Button className="w-full">
            Go to Contacts
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
        <p className="text-xs text-muted-foreground text-center">
          Add at least one contact to continue
        </p>
      </div>
    ),
  },
  [OnboardingStep.CREATE_TEMPLATE]: {
    title: 'Create Your First Template',
    description: 'Create reusable message templates',
    icon: FileText,
    content: (
      <div className="space-y-4">
        <p className="text-muted-foreground">
          Templates help you create consistent messages. Create your first SMS template to get started.
        </p>
        <Link href="/templates">
          <Button className="w-full">
            Go to Templates
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
        <p className="text-xs text-muted-foreground text-center">
          Create a template to continue
        </p>
      </div>
    ),
  },
  [OnboardingStep.CREATE_CAMPAIGN]: {
    title: 'Launch Your First Campaign',
    description: 'Send messages to your contacts',
    icon: Megaphone,
    content: (
      <div className="space-y-4">
        <p className="text-muted-foreground">
          Campaigns let you send messages to multiple contacts at once. Create your first campaign to start engaging with your audience.
        </p>
        <Link href="/campaigns/new">
          <Button className="w-full">
            Create Campaign
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
        <p className="text-xs text-muted-foreground text-center">
          Create a campaign to continue
        </p>
      </div>
    ),
  },
  [OnboardingStep.CREATE_JOURNEY]: {
    title: 'Build Your First Journey',
    description: 'Automate your customer communication',
    icon: MessageSquare,
    content: (
      <div className="space-y-4">
        <p className="text-muted-foreground">
          Journeys automate your messaging workflows. Create a journey to send messages based on triggers and conditions.
        </p>
        <Link href="/templates?tab=journeys">
          <Button className="w-full">
            Create Journey
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
        <p className="text-xs text-muted-foreground text-center">
          Create a journey to complete onboarding
        </p>
      </div>
    ),
  },
  [OnboardingStep.COMPLETE]: {
    title: "You're All Set! 🎊",
    description: 'Welcome to NurtureEngine',
    icon: CheckCircle2,
    content: (
      <div className="space-y-4 text-center">
        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        </div>
        <p className="text-muted-foreground">
          You&apos;ve completed the onboarding process! You&apos;re ready to start engaging with your contacts.
        </p>
        <Link href="/dashboard">
          <Button className="w-full">
            Go to Dashboard
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>
    ),
  },
};

const allSteps = [
  OnboardingStep.WELCOME,
  OnboardingStep.CONNECT_TWILIO,
  OnboardingStep.ADD_CONTACTS,
  OnboardingStep.CREATE_TEMPLATE,
  OnboardingStep.CREATE_CAMPAIGN,
  OnboardingStep.CREATE_JOURNEY,
];

export function OnboardingFlow() {
  const router = useRouter();
  const { data: progress, isLoading } = useOnboardingProgress();
  const completeStep = useCompleteOnboardingStep();
  const skipOnboarding = useSkipOnboarding();
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if onboarding was skipped or completed
    if (progress?.skipped || progress?.isCompleted) {
      setIsDismissed(true);
    }
  }, [progress]);

  // Note: Auto-validation happens on the backend when getProgress is called
  // The progress will automatically update when steps are completed

  if (isLoading || !progress || isDismissed || progress.skipped || progress.isCompleted) {
    return null;
  }

  const currentStepIndex = allSteps.indexOf(progress.currentStep);
  const progressPercentage = ((currentStepIndex + 1) / allSteps.length) * 100;
  const config = stepConfig[progress.currentStep];
  const Icon = config.icon;

  const handleNext = async () => {
    if (progress.currentStep === OnboardingStep.COMPLETE) {
      router.push('/dashboard');
      return;
    }

    await completeStep.mutateAsync({
      step: progress.currentStep,
    });
  };

  const handleSkip = async () => {
    await skipOnboarding.mutateAsync();
    setIsDismissed(true);
  };

  const handleBack = () => {
    // Allow going back to previous steps
    const prevIndex = Math.max(0, currentStepIndex - 1);
    const prevStep = allSteps[prevIndex];
    completeStep.mutateAsync({ step: prevStep });
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed bottom-6 right-6 z-50 w-full max-w-md"
      >
        <Card className="shadow-2xl border-2">
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">{config.title}</CardTitle>
                  <CardDescription className="mt-1">{config.description}</CardDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleSkip}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                <span>Step {currentStepIndex + 1} of {allSteps.length}</span>
                <span>{Math.round(progressPercentage)}%</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {config.content}
            <div className="flex items-center gap-2 pt-4 border-t">
              {currentStepIndex > 0 && (
                <Button
                  variant="outline"
                  onClick={handleBack}
                  disabled={completeStep.isPending}
                  className="flex-1"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
              )}
              {progress.currentStep !== OnboardingStep.COMPLETE && (
                <Button
                  onClick={handleNext}
                  disabled={completeStep.isPending}
                  className="flex-1"
                >
                  {completeStep.isPending ? 'Saving...' : 'Mark as Complete'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}

