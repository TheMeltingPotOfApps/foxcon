import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';

export enum OnboardingStep {
  WELCOME = 'welcome',
  CONNECT_TWILIO = 'connect_twilio',
  ADD_CONTACTS = 'add_contacts',
  CREATE_TEMPLATE = 'create_template',
  CREATE_CAMPAIGN = 'create_campaign',
  CREATE_JOURNEY = 'create_journey',
  COMPLETE = 'complete',
}

export interface OnboardingProgress {
  id: string;
  tenantId: string;
  userId: string;
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  stepData: {
    [key in OnboardingStep]?: {
      completed: boolean;
      completedAt?: string;
      data?: any;
    };
  };
  isCompleted: boolean;
  completedAt?: string;
  skipped: boolean;
  createdAt: string;
  updatedAt: string;
}

export function useOnboardingProgress() {
  return useQuery({
    queryKey: ['onboarding', 'progress'],
    queryFn: async () => {
      try {
        const response = await apiClient.get('/onboarding/progress');
        return response.data as OnboardingProgress;
      } catch (error: any) {
        // If 401 (unauthorized), return null to prevent constant retries
        // The onboarding flow will simply not show if user is not authenticated
        if (error?.response?.status === 401) {
          return null;
        }
        throw error;
      }
    },
    refetchInterval: (query) => {
      // Only refetch if we have valid data (user is authenticated)
      // If query state is error or data is null/undefined, don't refetch
      if (query.state.status === 'error' || !query.state.data) {
        return false;
      }
      
      const progress = query.state.data as OnboardingProgress | undefined;
      // Stop polling if onboarding is completed or skipped
      if (progress?.isCompleted || progress?.skipped) {
        return false;
      }
      
      // Only poll every 30 seconds (reduced from 5 seconds to reduce server load)
      // This is still frequent enough to auto-detect completed steps
      return 30000;
    },
    retry: (failureCount, error: any) => {
      // Don't retry on 401 errors (authentication required)
      if (error?.response?.status === 401) {
        return false;
      }
      // Retry up to 2 times for other errors
      return failureCount < 2;
    },
  });
}

export function useCompleteOnboardingStep() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ step, data }: { step: OnboardingStep; data?: any }) => {
      const response = await apiClient.post('/onboarding/complete-step', { step, data });
      return response.data as OnboardingProgress;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding', 'progress'] });
    },
  });
}

export function useSkipOnboarding() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.post('/onboarding/skip');
      return response.data as OnboardingProgress;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding', 'progress'] });
    },
  });
}

