import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';

export interface Tenant {
  id: string;
  name: string;
  slug?: string;
  logoUrl?: string;
  timezone?: string;
  legalFooterTemplate?: string;
  branding?: {
    primaryColor?: string;
    secondaryColor?: string;
    logo?: string;
  };
  aiDefaults?: {
    tone?: string;
    persona?: string;
    autoSend?: boolean;
  };
  isActive: boolean;
  audioCreditsBalance: number;
  stripeCustomerId?: string;
  billing?: {
    planType?: string;
    subscriptionId?: string;
    trialEndsAt?: Date;
  };
  createdAt: string;
  updatedAt: string;
}

export function useTenant() {
  return useQuery({
    queryKey: ['tenant', 'current'],
    queryFn: async () => {
      const response = await apiClient.get('/tenants/current');
      return response.data as Tenant;
    },
  });
}

export function useUpdateTenant() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (updates: Partial<Tenant>) => {
      const response = await apiClient.patch('/tenants/current', updates);
      return response.data as Tenant;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant', 'current'] });
    },
  });
}

