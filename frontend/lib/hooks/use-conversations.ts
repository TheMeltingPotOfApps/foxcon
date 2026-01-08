import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { apiClient } from '../api/client';

export interface Message {
  id: string;
  conversationId: string;
  direction: 'INBOUND' | 'OUTBOUND';
  body: string;
  status: 'QUEUED' | 'SENT' | 'DELIVERED' | 'FAILED' | 'READ';
  twilioMessageId?: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  contactId: string;
  contact?: {
    id: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    phoneNumber?: string;
  };
  campaignId?: string;
  status: 'OPEN' | 'CLOSED' | 'ARCHIVED';
  lastMessageAt: string | Date;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
  messages?: Message[];
}

export function useConversations(filters?: { status?: string; contactId?: string }) {
  // Create a stable query key to prevent React hooks error #185
  const queryKey = useMemo(() => {
    const key: any[] = ['conversations'];
    if (filters?.status) key.push('status', filters.status);
    if (filters?.contactId) key.push('contactId', filters.contactId);
    return key;
  }, [filters?.status, filters?.contactId]);

  return useQuery({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.contactId) params.append('contactId', filters.contactId);
      const response = await apiClient.get(`/conversations?${params.toString()}`);
      return response.data as Conversation[];
    },
  });
}

export function useConversation(id: string) {
  return useQuery({
    queryKey: ['conversations', id],
    queryFn: async () => {
      const response = await apiClient.get(`/conversations/${id}`);
      return response.data as Conversation;
    },
    enabled: !!id,
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { conversationId: string; body: string; messageType?: 'SMS' | 'IMESSAGE' }) => {
      const response = await apiClient.post(`/conversations/${data.conversationId}/messages`, {
        body: data.body,
        messageType: data.messageType || 'SMS',
      });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['conversations', variables.conversationId] });
    },
  });
}

export function useCloseConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.post(`/conversations/${id}/close`);
      return response.data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['conversations', id] });
    },
  });
}

