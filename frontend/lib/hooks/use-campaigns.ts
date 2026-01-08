import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';

export interface Campaign {
  id: string;
  name: string;
  type: 'OUTBOUND' | 'CONVERSATIONAL';
  status: 'DRAFT' | 'SCHEDULED' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
  speed: number;
  aiEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  messageCount?: number;
  deliveredCount?: number;
  repliedCount?: number;
}

export function useCampaigns() {
  return useQuery({
    queryKey: ['campaigns'],
    queryFn: async () => {
      const response = await apiClient.get('/campaigns');
      return Array.isArray(response.data) ? response.data : [];
    },
    refetchInterval: 30000, // Refresh every 30 seconds to get updated stats
  });
}

export function useCampaign(id: string) {
  return useQuery({
    queryKey: ['campaigns', id],
    queryFn: async () => {
      const response = await apiClient.get(`/campaigns/${id}`);
      return response.data as Campaign;
    },
    enabled: !!id,
    refetchInterval: (query) => {
      // Auto-refresh every 10 seconds if campaign is RUNNING
      const campaign = query.state.data as Campaign | undefined;
      return campaign?.status === 'RUNNING' ? 10000 : false;
    },
  });
}

export function useCreateCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Campaign>) => {
      const response = await apiClient.post('/campaigns', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });
}

export function useLaunchCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.post(`/campaigns/${id}/launch`);
      return response.data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['campaigns', id] });
    },
  });
}

export function usePauseCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.post(`/campaigns/${id}/pause`);
      return response.data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['campaigns', id] });
    },
  });
}

export function useUpdateCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Campaign> }) => {
      const response = await apiClient.put(`/campaigns/${id}`, data);
      return response.data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['campaigns', id] });
    },
  });
}

