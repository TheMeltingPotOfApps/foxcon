import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { apiClient } from '../api/client';

export interface Notification {
  id: string;
  userId: string;
  type: 'SMS_REPLY' | 'CAMPAIGN_REPLY' | 'JOURNEY_REPLY' | 'CONVERSATION_MESSAGE' | 'CAMPAIGN_COMPLETED' | 'JOURNEY_COMPLETED';
  title: string;
  message?: string;
  status: 'UNREAD' | 'READ' | 'ARCHIVED';
  metadata?: {
    campaignId?: string;
    journeyId?: string;
    contactId?: string;
    conversationId?: string;
    messageId?: string;
    [key: string]: any;
  };
  readAt?: string;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationPreferences {
  id: string;
  userId: string;
  campaignId?: string | null;
  journeyId?: string | null;
  conversationId?: string | null;
  smsReplyEnabled: boolean;
  campaignReplyEnabled: boolean;
  journeyReplyEnabled: boolean;
  conversationMessageEnabled: boolean;
  campaignCompletedEnabled: boolean;
  journeyCompletedEnabled: boolean;
  channels: {
    channels: ('IN_APP' | 'EMAIL' | 'SMS')[];
  };
}

export function useNotifications(options?: {
  status?: 'UNREAD' | 'READ' | 'ARCHIVED';
  type?: Notification['type'];
  limit?: number;
  offset?: number;
}) {
  // Create a stable key for the query to prevent React hooks error #185
  // Extract individual properties to avoid object reference issues
  const status = options?.status;
  const type = options?.type;
  const limit = options?.limit;
  const offset = options?.offset;
  
  const queryKey = useMemo(() => {
    if (!options) return ['notifications'];
    const key: any[] = ['notifications'];
    if (status) key.push('status', status);
    if (type) key.push('type', type);
    if (limit) key.push('limit', limit);
    if (offset) key.push('offset', offset);
    return key;
  }, [options, status, type, limit, offset]);

  return useQuery({
    queryKey,
    queryFn: async () => {
      const params: any = {};
      if (options?.status) params.status = options.status;
      if (options?.type) params.type = options.type;
      if (options?.limit) params.limit = options.limit;
      if (options?.offset) params.offset = options.offset;

      const response = await apiClient.get('/notifications', { params });
      return response.data as { notifications: Notification[]; total: number };
    },
  });
}

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const response = await apiClient.get('/notifications/unread-count');
      return response.data.count as number;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await apiClient.put(`/notifications/${notificationId}/read`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.put('/notifications/read-all');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });
}

export function useClearAllReadNotifications() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.delete('/notifications/read-all');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });
}

export function useArchiveNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await apiClient.put(`/notifications/${notificationId}/archive`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await apiClient.delete(`/notifications/${notificationId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useNotificationPreferences(options?: {
  campaignId?: string;
  journeyId?: string;
  conversationId?: string;
}) {
  // Create a stable key for the query to prevent React hooks error #185
  // Extract individual properties to avoid object reference issues
  const campaignId = options?.campaignId;
  const journeyId = options?.journeyId;
  const conversationId = options?.conversationId;
  
  const queryKey = useMemo(() => {
    if (!options) return ['notification-preferences'];
    const key: any[] = ['notification-preferences'];
    if (campaignId) key.push('campaignId', campaignId);
    if (journeyId) key.push('journeyId', journeyId);
    if (conversationId) key.push('conversationId', conversationId);
    return key;
  }, [options, campaignId, journeyId, conversationId]);

  return useQuery({
    queryKey,
    queryFn: async () => {
      const params: any = {};
      if (options?.campaignId) params.campaignId = options.campaignId;
      if (options?.journeyId) params.journeyId = options.journeyId;
      if (options?.conversationId) params.conversationId = options.conversationId;

      const response = await apiClient.get('/notifications/preferences', { params });
      return response.data as NotificationPreferences | null;
    },
  });
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      preferences: Partial<NotificationPreferences>;
      campaignId?: string;
      journeyId?: string;
      conversationId?: string;
    }) => {
      const params: any = {};
      if (data.campaignId) params.campaignId = data.campaignId;
      if (data.journeyId) params.journeyId = data.journeyId;
      if (data.conversationId) params.conversationId = data.conversationId;

      const response = await apiClient.put('/notifications/preferences', data.preferences, { params });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
    },
  });
}

