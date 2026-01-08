import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';

export interface PricingPlan {
  id: string;
  name: string;
  displayName?: string;
  description?: string;
  smsLimit: number;
  callLimit: number;
  aiMessageLimit: number;
  aiVoiceLimit: number;
  aiTemplateLimit: number;
  contentAiLimit: number;
  restrictions: {
    canSendSMS?: boolean;
    canMakeCalls?: boolean;
    canUseAI?: boolean;
    canUseVoiceAI?: boolean;
    canUseContentAI?: boolean;
    canCreateJourneys?: boolean;
    canCreateCampaigns?: boolean;
    canUseScheduling?: boolean;
    maxContacts?: number;
    maxSegments?: number;
    maxTemplates?: number;
    maxJourneys?: number;
    maxCampaigns?: number;
  };
  monthlyPrice?: number;
  yearlyPrice?: number;
  trialDays?: number;
  isActive: boolean;
  isDefault: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export function usePricingPlans() {
  return useQuery({
    queryKey: ['pricing-plans'],
    queryFn: async () => {
      const response = await apiClient.get('/pricing-plans');
      return response.data as PricingPlan[];
    },
  });
}

export function usePricingPlansAdmin() {
  return useQuery({
    queryKey: ['pricing-plans', 'admin'],
    queryFn: async () => {
      const response = await apiClient.get('/pricing-plans/all');
      return response.data as PricingPlan[];
    },
  });
}

export function useCreatePricingPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<PricingPlan>) => {
      const response = await apiClient.post('/pricing-plans', data);
      return response.data as PricingPlan;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-plans'] });
    },
  });
}

export function useUpdatePricingPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<PricingPlan> }) => {
      const response = await apiClient.put(`/pricing-plans/${id}`, data);
      return response.data as PricingPlan;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-plans'] });
    },
  });
}

export function useDeletePricingPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/pricing-plans/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-plans'] });
    },
  });
}

export function useSetDefaultPricingPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.post(`/pricing-plans/${id}/set-default`);
      return response.data as PricingPlan;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-plans'] });
    },
  });
}

