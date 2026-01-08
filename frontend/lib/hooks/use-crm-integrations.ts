import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { marketplaceApiClient } from '../api/marketplace-client';

export enum CrmProvider {
  HUBSPOT = 'HUBSPOT',
  SALESFORCE = 'SALESFORCE',
  PIPEDRIVE = 'PIPEDRIVE',
  ZOHO = 'ZOHO',
  ACTIVE_CAMPAIGN = 'ACTIVE_CAMPAIGN',
  MAILCHIMP = 'MAILCHIMP',
  CUSTOM = 'CUSTOM',
}

export enum SyncDirection {
  ENGINE_TO_CRM = 'ENGINE_TO_CRM',
  CRM_TO_ENGINE = 'CRM_TO_ENGINE',
  BIDIRECTIONAL = 'BIDIRECTIONAL',
}

export interface CrmIntegration {
  id: string;
  tenantId?: string;
  userId?: string;
  marketplaceUserId?: string;
  type: 'ENGINE' | 'MARKETPLACE';
  provider: CrmProvider;
  name: string;
  apiUrl?: string;
  accountId?: string;
  isActive: boolean;
  syncDirection: SyncDirection;
  fieldMappings?: {
    contact: {
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      company?: string;
      [key: string]: string | undefined;
    };
    custom?: Record<string, string>;
  };
  syncSettings?: {
    syncContacts: boolean;
    syncLeads: boolean;
    syncDeals: boolean;
    autoSync: boolean;
    syncInterval?: number;
    lastSyncAt?: Date;
  };
  oauthConfig?: {
    clientId?: string;
    redirectUri?: string;
    scope?: string[];
    expiresAt?: Date;
  };
  syncToLinkedAccount: boolean;
  linkedAccountSyncedAt?: Date;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCrmIntegrationDto {
  provider: CrmProvider;
  name?: string;
  apiKey?: string;
  accessToken?: string;
  refreshToken?: string;
  apiUrl?: string;
  accountId?: string;
  syncDirection?: SyncDirection;
  fieldMappings?: CrmIntegration['fieldMappings'];
  syncSettings?: CrmIntegration['syncSettings'];
  oauthConfig?: CrmIntegration['oauthConfig'];
  syncToLinkedAccount?: boolean;
  metadata?: Record<string, any>;
}

export interface UpdateCrmIntegrationDto {
  name?: string;
  apiKey?: string;
  accessToken?: string;
  refreshToken?: string;
  apiUrl?: string;
  accountId?: string;
  isActive?: boolean;
  syncDirection?: SyncDirection;
  fieldMappings?: CrmIntegration['fieldMappings'];
  syncSettings?: CrmIntegration['syncSettings'];
  oauthConfig?: CrmIntegration['oauthConfig'];
  syncToLinkedAccount?: boolean;
  metadata?: Record<string, any>;
}

// Engine hooks
export function useCrmIntegrations() {
  return useQuery<CrmIntegration[]>({
    queryKey: ['crm-integrations'],
    queryFn: async () => {
      const response = await apiClient.get('/crm-integrations');
      return response.data;
    },
  });
}

export function useCrmIntegration(id: string) {
  return useQuery<CrmIntegration>({
    queryKey: ['crm-integrations', id],
    queryFn: async () => {
      const response = await apiClient.get(`/crm-integrations/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreateCrmIntegration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateCrmIntegrationDto) => {
      const response = await apiClient.post('/crm-integrations', dto);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-integrations'] });
    },
  });
}

export function useUpdateCrmIntegration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: UpdateCrmIntegrationDto }) => {
      const response = await apiClient.put(`/crm-integrations/${id}`, dto);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['crm-integrations'] });
      queryClient.invalidateQueries({ queryKey: ['crm-integrations', variables.id] });
    },
  });
}

export function useDeleteCrmIntegration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/crm-integrations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-integrations'] });
    },
  });
}

export function useTestCrmConnection() {
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.post(`/crm-integrations/${id}/test`);
      return response.data;
    },
  });
}

// Marketplace hooks
export function useMarketplaceCrmIntegrations() {
  return useQuery<CrmIntegration[]>({
    queryKey: ['marketplace-crm-integrations'],
    queryFn: async () => {
      const response = await marketplaceApiClient.get('/marketplace/crm-integrations');
      return response.data;
    },
  });
}

export function useMarketplaceCrmIntegration(id: string) {
  return useQuery<CrmIntegration>({
    queryKey: ['marketplace-crm-integrations', id],
    queryFn: async () => {
      const response = await marketplaceApiClient.get(`/marketplace/crm-integrations/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreateMarketplaceCrmIntegration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateCrmIntegrationDto) => {
      const response = await marketplaceApiClient.post('/marketplace/crm-integrations', dto);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-crm-integrations'] });
    },
  });
}

export function useUpdateMarketplaceCrmIntegration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: UpdateCrmIntegrationDto }) => {
      const response = await marketplaceApiClient.put(`/marketplace/crm-integrations/${id}`, dto);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-crm-integrations'] });
      queryClient.invalidateQueries({ queryKey: ['marketplace-crm-integrations', variables.id] });
    },
  });
}

export function useDeleteMarketplaceCrmIntegration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await marketplaceApiClient.delete(`/marketplace/crm-integrations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-crm-integrations'] });
    },
  });
}

export function useTestMarketplaceCrmConnection() {
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await marketplaceApiClient.post(`/marketplace/crm-integrations/${id}/test`);
      return response.data;
    },
  });
}

