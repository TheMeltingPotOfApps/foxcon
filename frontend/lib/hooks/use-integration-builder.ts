import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '../api/client';

export interface IntegrationConfig {
  name: string;
  description: string;
  serviceType: 'webhook' | 'api' | 'form' | 'zapier' | 'make' | 'hubspot' | 'salesforce' | 'custom';
  webhookUrl?: string;
  httpMethod?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  authentication?: {
    type: 'none' | 'api_key' | 'bearer' | 'basic' | 'oauth2' | 'custom';
    config?: Record<string, any>;
  };
  parameterMappings?: Array<{
    sourceField: string;
    targetField: string;
    required: boolean;
    defaultValue?: any;
    transform?: string;
  }>;
  bodyTemplate?: string;
  queryParams?: Record<string, string>;
  responseHandling?: {
    successField?: string;
    errorField?: string;
    extractFields?: string[];
  };
  retryConfig?: {
    maxRetries?: number;
    retryDelay?: number;
    retryOnStatusCodes?: number[];
  };
  rateLimiting?: {
    requestsPerMinute?: number;
    requestsPerHour?: number;
  };
}

export function useGenerateIntegration() {
  return useMutation({
    mutationFn: async ({
      description,
      integrationType,
      context,
    }: {
      description: string;
      integrationType: 'lead_ingestion' | 'webhook';
      context?: {
        contactFields?: string[];
        journeyData?: any;
        existingIntegrations?: string[];
      };
    }) => {
      const response = await apiClient.post('/ai/integrations/generate', {
        description,
        integrationType,
        context,
      });
      return response.data as IntegrationConfig;
    },
  });
}

export function useGenerateServiceIntegration() {
  return useMutation({
    mutationFn: async ({
      serviceName,
      integrationType,
      options,
    }: {
      serviceName: string;
      integrationType: 'lead_ingestion' | 'webhook';
      options?: {
        apiKey?: string;
        webhookUrl?: string;
        customFields?: Record<string, any>;
      };
    }) => {
      const response = await apiClient.post(`/ai/integrations/generate-service/${serviceName}`, {
        integrationType,
        options,
      });
      return response.data as IntegrationConfig;
    },
  });
}

export function useEnhanceIntegration() {
  return useMutation({
    mutationFn: async ({
      config,
      testPayload,
    }: {
      config: IntegrationConfig;
      testPayload?: Record<string, any>;
    }) => {
      const response = await apiClient.post('/ai/integrations/enhance', {
        config,
        testPayload,
      });
      return response.data as IntegrationConfig;
    },
  });
}

export function useSupportedServices() {
  return useQuery({
    queryKey: ['integration-services'],
    queryFn: async () => {
      const response = await apiClient.get('/ai/integrations/services');
      return response.data as string[];
    },
  });
}

export function useGenerateLeadIngestionWithAi() {
  return useMutation({
    mutationFn: async ({
      description,
      context,
    }: {
      description: string;
      context?: {
        contactFields?: string[];
        existingIntegrations?: string[];
      };
    }) => {
      const response = await apiClient.post('/lead-ingestion/generate-with-ai', {
        description,
        context,
      });
      return response.data;
    },
  });
}

export function useGenerateWebhookNodeWithAi() {
  return useMutation({
    mutationFn: async ({
      description,
      journeyId,
      context,
    }: {
      description: string;
      journeyId?: string;
      context?: {
        contactFields?: string[];
        journeyData?: any;
      };
    }) => {
      const response = await apiClient.post('/journeys/webhook-nodes/generate-with-ai', {
        description,
        journeyId,
        context,
      });
      return response.data;
    },
  });
}

