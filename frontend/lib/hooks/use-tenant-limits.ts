import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';

export interface TenantLimits {
  id: string;
  tenantId: string;
  smsLimit: number;
  smsUsed: number;
  callLimit: number;
  callUsed: number;
  aiMessageLimit: number;
  aiMessageUsed: number;
  aiVoiceLimit: number;
  aiVoiceUsed: number;
  aiTemplateLimit: number;
  aiTemplateUsed: number;
  contentAiLimit: number;
  contentAiUsed: number;
  planType: string;
  trialEndsAt?: string;
  isActive: boolean;
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
  createdAt: string;
  updatedAt: string;
}

export function useTenantLimits() {
  return useQuery({
    queryKey: ['tenant-limits'],
    queryFn: async () => {
      const response = await apiClient.get('/tenant-limits');
      return response.data as TenantLimits;
    },
  });
}

