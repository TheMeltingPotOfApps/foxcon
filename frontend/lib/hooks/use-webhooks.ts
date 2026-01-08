import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';

export type WebhookEvent =
  | 'CONTACT_CREATED'
  | 'CONTACT_UPDATED'
  | 'CONTACT_OPTED_OUT'
  | 'CAMPAIGN_LAUNCHED'
  | 'CAMPAIGN_PAUSED'
  | 'CAMPAIGN_COMPLETED'
  | 'MESSAGE_SENT'
  | 'MESSAGE_DELIVERED'
  | 'MESSAGE_FAILED'
  | 'CONVERSATION_CREATED'
  | 'CONVERSATION_CLOSED'
  | 'JOURNEY_ENROLLED'
  | 'JOURNEY_COMPLETED';

export interface Webhook {
  id: string;
  url: string;
  events: WebhookEvent[];
  isActive: boolean;
  secret?: string;
  headers?: Record<string, string>;
  successCount: number;
  failureCount: number;
  lastTriggeredAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWebhookDto {
  url: string;
  events: WebhookEvent[];
  isActive?: boolean;
  secret?: string;
  headers?: Record<string, string>;
}

export function useWebhooks() {
  return useQuery({
    queryKey: ['webhooks'],
    queryFn: async () => {
      const response = await apiClient.get('/webhooks');
      return Array.isArray(response.data) ? response.data : [];
    },
  });
}

export function useWebhook(id: string) {
  return useQuery({
    queryKey: ['webhooks', id],
    queryFn: async () => {
      const response = await apiClient.get(`/webhooks/${id}`);
      return response.data as Webhook;
    },
    enabled: !!id,
  });
}

export function useCreateWebhook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateWebhookDto) => {
      const response = await apiClient.post('/webhooks', data);
      return response.data as Webhook;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
    },
  });
}

export function useUpdateWebhook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateWebhookDto> }) => {
      const response = await apiClient.put(`/webhooks/${id}`, data);
      return response.data as Webhook;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      queryClient.invalidateQueries({ queryKey: ['webhooks', variables.id] });
    },
  });
}

export function useDeleteWebhook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/webhooks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
    },
  });
}

export function useTestWebhook() {
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.post(`/webhooks/${id}/test`);
      return response.data as { success: boolean; message: string };
    },
  });
}

