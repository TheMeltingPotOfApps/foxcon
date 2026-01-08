import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';

export interface TenantLeadStatus {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  color?: string;
  displayOrder: number;
  isActive: boolean;
  isSystem: boolean;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface StatusAutomation {
  id: string;
  tenantId: string;
  name: string;
  triggerType: 'TIME_BASED' | 'STATUS_CHANGE';
  fromStatusId?: string;
  timeValue?: number;
  timeUnit?: 'MINUTES' | 'HOURS' | 'DAYS';
  triggerStatusId?: string;
  targetStatusId: string;
  isActive: boolean;
  conditions?: {
    campaignIds?: string[];
    journeyIds?: string[];
    tags?: string[];
    [key: string]: any;
  };
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  fromStatus?: TenantLeadStatus;
  triggerStatus?: TenantLeadStatus;
  targetStatus: TenantLeadStatus;
}

export interface CreateStatusDto {
  name: string;
  description?: string;
  color?: string;
  displayOrder?: number;
  isActive?: boolean;
  metadata?: Record<string, any>;
}

export interface UpdateStatusDto {
  name?: string;
  description?: string;
  color?: string;
  displayOrder?: number;
  isActive?: boolean;
  metadata?: Record<string, any>;
}

export interface CreateAutomationDto {
  name: string;
  triggerType: 'TIME_BASED' | 'STATUS_CHANGE';
  fromStatusId?: string;
  timeValue?: number;
  timeUnit?: 'MINUTES' | 'HOURS' | 'DAYS';
  triggerStatusId?: string;
  targetStatusId: string;
  isActive?: boolean;
  conditions?: {
    campaignIds?: string[];
    journeyIds?: string[];
    tags?: string[];
    [key: string]: any;
  };
}

export interface UpdateAutomationDto {
  name?: string;
  triggerType?: 'TIME_BASED' | 'STATUS_CHANGE';
  fromStatusId?: string;
  timeValue?: number;
  timeUnit?: 'MINUTES' | 'HOURS' | 'DAYS';
  triggerStatusId?: string;
  targetStatusId?: string;
  isActive?: boolean;
  conditions?: {
    campaignIds?: string[];
    journeyIds?: string[];
    tags?: string[];
    [key: string]: any;
  };
}

export function useLeadStatuses(includeInactive = false) {
  return useQuery({
    queryKey: ['lead-statuses', includeInactive],
    queryFn: async () => {
      const response = await apiClient.get('/lead-statuses', {
        params: { includeInactive },
      });
      return response.data as TenantLeadStatus[];
    },
  });
}

export function useLeadStatus(id: string) {
  return useQuery({
    queryKey: ['lead-status', id],
    queryFn: async () => {
      const response = await apiClient.get(`/lead-statuses/${id}`);
      return response.data as TenantLeadStatus;
    },
    enabled: !!id,
  });
}

export function useCreateStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateStatusDto) => {
      const response = await apiClient.post('/lead-statuses', data);
      return response.data as TenantLeadStatus;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-statuses'] });
    },
  });
}

export function useUpdateStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateStatusDto }) => {
      const response = await apiClient.put(`/lead-statuses/${id}`, data);
      return response.data as TenantLeadStatus;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-statuses'] });
    },
  });
}

export function useDeleteStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/lead-statuses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-statuses'] });
    },
  });
}

export function useReorderStatuses() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (statusIds: string[]) => {
      const response = await apiClient.post('/lead-statuses/reorder', { statusIds });
      return response.data as TenantLeadStatus[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-statuses'] });
    },
  });
}

export function useStatusAutomations(includeInactive = false) {
  return useQuery({
    queryKey: ['status-automations', includeInactive],
    queryFn: async () => {
      const response = await apiClient.get('/lead-statuses/automations', {
        params: { includeInactive },
      });
      return response.data as StatusAutomation[];
    },
  });
}

export function useStatusAutomation(id: string) {
  return useQuery({
    queryKey: ['status-automation', id],
    queryFn: async () => {
      const response = await apiClient.get(`/lead-statuses/automations/${id}`);
      return response.data as StatusAutomation;
    },
    enabled: !!id,
  });
}

export function useCreateAutomation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateAutomationDto) => {
      const response = await apiClient.post('/lead-statuses/automations', data);
      return response.data as StatusAutomation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['status-automations'] });
    },
  });
}

export function useUpdateAutomation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateAutomationDto }) => {
      const response = await apiClient.put(`/lead-statuses/automations/${id}`, data);
      return response.data as StatusAutomation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['status-automations'] });
    },
  });
}

export function useDeleteAutomation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/lead-statuses/automations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['status-automations'] });
    },
  });
}

