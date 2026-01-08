import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';

export interface TwilioConfig {
  id: string;
  tenantId: string;
  accountSid: string;
  authToken: string;
  messagingServiceSid?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TwilioNumber {
  id: string;
  tenantId: string;
  phoneNumber: string;
  twilioSid: string;
  capabilities?: {
    voice?: boolean;
    sms?: boolean;
    mms?: boolean;
  };
  friendlyName?: string;
  status: string;
  numberPoolId?: string;
  maxMessagesPerDay?: number | null;
  messagesSentToday?: number;
  lastResetDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NumberPool {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  isActive: boolean;
  maxMessagesPerDay?: number | null;
  totalMessagesSentToday?: number;
  lastResetDate?: string | null;
  numbers?: TwilioNumber[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateTwilioConfigDto {
  accountSid: string;
  authToken: string;
  messagingServiceSid?: string;
}

export interface CreateNumberPoolDto {
  name: string;
  description?: string;
  maxMessagesPerDay?: number | null;
}

export function useTwilioConfig() {
  return useQuery({
    queryKey: ['twilio-config'],
    queryFn: async () => {
      const response = await apiClient.get('/twilio/config');
      return response.data as TwilioConfig;
    },
    retry: false,
  });
}

export function useCreateTwilioConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateTwilioConfigDto) => {
      const response = await apiClient.post('/twilio/config', data);
      return response.data as TwilioConfig;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['twilio-config'] });
      queryClient.invalidateQueries({ queryKey: ['twilio-numbers'] });
    },
  });
}

export interface TwilioNumbersResponse {
  data: TwilioNumber[];
  total: number;
  page: number;
  limit: number;
}

export function useTwilioNumbers(poolId?: string, page: number = 1, limit: number = 50) {
  return useQuery({
    queryKey: ['twilio-numbers', poolId, page, limit],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (poolId) params.append('poolId', poolId);
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      const response = await apiClient.get(`/twilio/numbers?${params.toString()}`);
      return response.data as TwilioNumbersResponse;
    },
  });
}

export function useImportTwilioNumbers() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.post('/twilio/numbers/import');
      return response.data as TwilioNumber[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['twilio-numbers'] });
    },
  });
}

export function usePurchaseTwilioNumber() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (areaCode: string) => {
      const response = await apiClient.post('/twilio/numbers/purchase', { areaCode });
      return response.data as TwilioNumber;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['twilio-numbers'] });
    },
  });
}

export function useUpdateTwilioNumber() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { maxMessagesPerDay?: number | null; friendlyName?: string } }) => {
      const response = await apiClient.post(`/twilio/numbers/${id}`, data);
      return response.data as TwilioNumber;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['twilio-numbers'] });
    },
  });
}

export function useNumberPools() {
  return useQuery({
    queryKey: ['number-pools'],
    queryFn: async () => {
      const response = await apiClient.get('/twilio/pools');
      return Array.isArray(response.data) ? response.data : [];
    },
  });
}

export function useCreateNumberPool() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateNumberPoolDto) => {
      const response = await apiClient.post('/twilio/pools', data);
      return response.data as NumberPool;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['number-pools'] });
    },
  });
}

export function useUpdateNumberPool() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateNumberPoolDto & { isActive?: boolean }> }) => {
      const response = await apiClient.post(`/twilio/pools/${id}`, data);
      return response.data as NumberPool;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['number-pools'] });
      queryClient.invalidateQueries({ queryKey: ['twilio-numbers'] });
    },
  });
}

export function useDeleteNumberPool() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.post(`/twilio/pools/${id}/delete`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['number-pools'] });
      queryClient.invalidateQueries({ queryKey: ['twilio-numbers'] });
    },
  });
}

export function useAssignNumberToPool() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ numberId, poolId }: { numberId: string; poolId: string }) => {
      const response = await apiClient.post(`/twilio/numbers/${numberId}/assign-pool`, { poolId });
      return response.data as TwilioNumber;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['twilio-numbers'] });
      queryClient.invalidateQueries({ queryKey: ['number-pools'] });
    },
  });
}

export function useRemoveNumberFromPool() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (numberId: string) => {
      const response = await apiClient.post(`/twilio/numbers/${numberId}/remove-pool`);
      return response.data as TwilioNumber;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['twilio-numbers'] });
      queryClient.invalidateQueries({ queryKey: ['number-pools'] });
    },
  });
}

export function useTestTwilioConnection() {
  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.post('/twilio/test-connection');
      return response.data as { success: boolean; message: string };
    },
  });
}

