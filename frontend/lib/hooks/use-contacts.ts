import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { useAuthStore } from '../../store/auth-store';

export type LeadStatus = 'SOLD' | 'DNC' | 'CONTACT_MADE' | 'PAUSED' | 'APPOINTMENT_SCHEDULED';

export interface Contact {
  id: string;
  firstName?: string;
  lastName?: string;
  phone: string;
  email?: string;
  city?: string;
  state?: string;
  country?: string;
  timezone?: string;
  optedIn?: boolean;
  optedOut: boolean;
  leadStatus?: LeadStatus;
  attributes?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface TimelineEvent {
  type: 'message' | 'conversation_started' | 'campaign_added' | 'journey_enrolled';
  date: string;
  data: any;
}

export interface ContactTimeline {
  contact: Contact;
  timeline: TimelineEvent[];
  stats: {
    totalMessages: number;
    totalCampaigns: number;
    totalJourneys: number;
    totalConversations: number;
  };
}

export interface ContactsResponse {
  data: Contact[];
  total: number;
  page: number;
  limit: number;
}

export interface ContactWithActions extends Contact {
  journeyActionsCount?: number;
}

export function useContacts(
  page: number = 1,
  limit: number = 50,
  sortBy: string = 'createdAt',
  sortOrder: 'ASC' | 'DESC' = 'DESC',
  search?: string,
) {
  const hasHydrated = useAuthStore((state) => state._hasHydrated);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const accessToken = useAuthStore((state) => state.accessToken);
  
  return useQuery({
    queryKey: ['contacts', page, limit, sortBy, sortOrder, search],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sortBy,
        sortOrder,
      });
      if (search) {
        params.append('search', search);
      }
      const response = await apiClient.get(`/contacts?${params.toString()}`);
      return response.data as ContactsResponse;
    },
    enabled: hasHydrated && isAuthenticated && !!accessToken,
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 401) {
        return false;
      }
      return failureCount < 3;
    },
  });
}

export function useContact(id: string) {
  return useQuery({
    queryKey: ['contacts', id],
    queryFn: async () => {
      const response = await apiClient.get(`/contacts/${id}`);
      return response.data as Contact;
    },
    enabled: !!id,
  });
}

export function useCreateContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Contact>) => {
      const response = await apiClient.post('/contacts', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });
}

export function useUpdateContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Contact> }) => {
      const response = await apiClient.put(`/contacts/${id}`, data);
      return response.data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contacts', id] });
    },
  });
}

export function useDeleteContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/contacts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });
}

export function useUpdateContactStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, leadStatus }: { id: string; leadStatus: LeadStatus }) => {
      const response = await apiClient.put(`/contacts/${id}/status`, { leadStatus });
      return response.data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contacts', id] });
      queryClient.invalidateQueries({ queryKey: ['contacts', id, 'timeline'] });
    },
  });
}

export function useContactTimeline(id: string) {
  return useQuery({
    queryKey: ['contacts', id, 'timeline'],
    queryFn: async () => {
      const response = await apiClient.get(`/contacts/${id}/timeline`);
      return response.data as ContactTimeline;
    },
    enabled: !!id,
  });
}

