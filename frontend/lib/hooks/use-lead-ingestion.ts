import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';

export enum IngestionActionType {
  CREATE_CONTACT = 'CREATE_CONTACT',
  ADD_TO_CAMPAIGN = 'ADD_TO_CAMPAIGN',
  REMOVE_FROM_CAMPAIGN = 'REMOVE_FROM_CAMPAIGN',
  ADD_TO_JOURNEY = 'ADD_TO_JOURNEY',
  REMOVE_FROM_JOURNEY = 'REMOVE_FROM_JOURNEY',
  PAUSE_IN_JOURNEY = 'PAUSE_IN_JOURNEY',
  UPDATE_CONTACT_STATUS = 'UPDATE_CONTACT_STATUS',
}

export interface ParameterMapping {
  paramName: string;
  contactField: string;
  required: boolean;
  defaultValue?: any;
}

export interface IngestionAction {
  type: IngestionActionType;
  config: {
    campaignId?: string;
    journeyId?: string;
    leadStatus?: string;
    [key: string]: any;
  };
}

export interface LeadIngestionEndpoint {
  id: string;
  name: string;
  description?: string;
  endpointKey: string;
  parameterMappings: ParameterMapping[];
  actions: IngestionAction[];
  isActive: boolean;
  apiKey: string;
  requestCount: number;
  successCount: number;
  failureCount: number;
  lastRequestAt?: string;
  metadata?: {
    ipWhitelist?: string[];
    rateLimit?: {
      requestsPerMinute?: number;
      requestsPerHour?: number;
    };
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateIngestionEndpointDto {
  name: string;
  description?: string;
  endpointKey: string;
  parameterMappings: ParameterMapping[];
  actions: IngestionAction[];
  isActive?: boolean;
  apiKey?: string;
  metadata?: {
    ipWhitelist?: string[];
    rateLimit?: {
      requestsPerMinute?: number;
      requestsPerHour?: number;
    };
  };
}

export function useIngestionEndpoints() {
  return useQuery({
    queryKey: ['lead-ingestion-endpoints'],
    queryFn: async () => {
      const response = await apiClient.get('/lead-ingestion');
      return response.data as LeadIngestionEndpoint[];
    },
  });
}

export function useIngestionEndpoint(id: string) {
  return useQuery({
    queryKey: ['lead-ingestion-endpoints', id],
    queryFn: async () => {
      const response = await apiClient.get(`/lead-ingestion/${id}`);
      return response.data as LeadIngestionEndpoint;
    },
    enabled: !!id,
  });
}

export function useCreateIngestionEndpoint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateIngestionEndpointDto) => {
      const response = await apiClient.post('/lead-ingestion', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-ingestion-endpoints'] });
    },
  });
}

export function useUpdateIngestionEndpoint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateIngestionEndpointDto> }) => {
      const response = await apiClient.put(`/lead-ingestion/${id}`, data);
      return response.data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['lead-ingestion-endpoints'] });
      queryClient.invalidateQueries({ queryKey: ['lead-ingestion-endpoints', id] });
    },
  });
}

export function useDeleteIngestionEndpoint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete(`/lead-ingestion/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-ingestion-endpoints'] });
    },
  });
}

export function useTestIngestionEndpoint() {
  return useMutation({
    mutationFn: async ({
      endpointKey,
      payload,
      apiKey,
      method = 'POST',
    }: {
      endpointKey: string;
      payload: Record<string, any>;
      apiKey?: string;
      method?: 'GET' | 'POST';
    }) => {
      const headers: Record<string, string> = {};
      if (apiKey) {
        headers['x-api-key'] = apiKey;
      }

      if (method === 'GET') {
        const response = await apiClient.get(`/ingest/${endpointKey}`, {
          params: payload,
          headers,
        });
        return response.data;
      }

      const response = await apiClient.post(`/ingest/${endpointKey}`, payload, {
        headers,
      });
      return response.data;
    },
  });
}

