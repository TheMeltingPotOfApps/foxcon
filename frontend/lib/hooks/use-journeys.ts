import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';

export interface Journey {
  id: string;
  name: string;
  description?: string;
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
  scheduleConfig?: {
    enabled?: boolean;
    timezone?: string;
    allowedDays?: number[];
    allowedHours?: { start: number; end: number };
    maxMessagesPerDay?: number;
  };
  entryCriteria?: {
    segmentIds?: string[];
    tags?: string[];
    attributes?: Record<string, any>;
  };
  removalCriteria?: {
    enabled?: boolean;
    conditions?: Array<{
      type: 'call_transferred' | 'call_duration' | 'webhook' | 'call_status' | 'custom';
      config?: {
        minDurationSeconds?: number;
        webhookUrl?: string;
        webhookPayloadField?: string;
        callStatuses?: string[];
        customCondition?: Record<string, any>;
      };
    }>;
  };
  autoEnrollEnabled?: boolean;
  startedAt?: string;
  pausedAt?: string;
  createdAt: string;
  updatedAt: string;
  nodes?: JourneyNode[];
  contacts?: any[];
}

export interface JourneyNode {
  id: string;
  journeyId: string;
  type: 'SEND_SMS' | 'ADD_TO_CAMPAIGN' | 'REMOVE_FROM_CAMPAIGN' | 'EXECUTE_WEBHOOK' | 'TIME_DELAY' | 'CONDITION' | 'WEIGHTED_PATH' | 'MAKE_CALL' | 'UPDATE_CONTACT_STATUS';
  positionX: number;
  positionY: number;
  config: any;
  connections?: {
    nextNodeId?: string;
    outputs?: Record<string, string>;
    conditions?: Array<{
      field: string;
      operator: string;
      value: any;
    }>;
  };
}

export function useJourneys() {
  return useQuery({
    queryKey: ['journeys'],
    queryFn: async () => {
      const response = await apiClient.get('/journeys');
      const journeys = Array.isArray(response.data) ? response.data : [];
      // Use contactsCount from backend if available, otherwise fall back to contacts.length
      return journeys.map((journey) => ({
        ...journey,
        contactsCount: (journey as any).contactsCount ?? journey.contacts?.length ?? 0,
        nodesCount: journey.nodes?.length || 0,
      }));
    },
  });
}

export function useJourney(id: string) {
  return useQuery({
    queryKey: ['journeys', id],
    queryFn: async () => {
      try {
        const response = await apiClient.get(`/journeys/${id}`);
        const journey = response.data as Journey;
        return {
          ...journey,
          // Use contactsCount from backend if available, otherwise fall back to contacts.length
          contactsCount: (journey as any).contactsCount ?? journey.contacts?.length ?? 0,
          nodesCount: journey.nodes?.length || 0,
        };
      } catch (error: any) {
        // Handle authentication errors gracefully
        if (error.response?.status === 401) {
          // Token might be expired - let the interceptor handle it
          throw error;
        }
        // Re-throw other errors
        throw error;
      }
    },
    enabled: !!id,
    retry: (failureCount, error: any) => {
      // Don't retry on 401/403/404 errors
      if (error?.response?.status === 401 || error?.response?.status === 403 || error?.response?.status === 404) {
        return false;
      }
      // Retry up to 2 times for other errors
      return failureCount < 2;
    },
  });
}

export function useCreateJourney() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Journey>) => {
      const response = await apiClient.post('/journeys', data);
      return response.data as Journey;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journeys'] });
    },
  });
}

export function useUpdateJourney() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Journey> }) => {
      const response = await apiClient.put(`/journeys/${id}`, data);
      return response.data as Journey;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['journeys'] });
      queryClient.invalidateQueries({ queryKey: ['journeys', variables.id] });
    },
  });
}

export function useDeleteJourney() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/journeys/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journeys'] });
    },
  });
}

export function useLaunchJourney() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.post(`/journeys/${id}/launch`);
      return response.data as Journey;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['journeys'] });
      queryClient.invalidateQueries({ queryKey: ['journeys', id] });
    },
  });
}

export function usePauseJourney() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.post(`/journeys/${id}/pause`);
      return response.data as Journey;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['journeys'] });
      queryClient.invalidateQueries({ queryKey: ['journeys', id] });
    },
  });
}

export function useAddJourneyNode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ journeyId, node }: { journeyId: string; node: Partial<JourneyNode> }) => {
      const response = await apiClient.post(`/journeys/${journeyId}/nodes`, node);
      return response.data as JourneyNode;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['journeys', variables.journeyId] });
    },
  });
}

export function useUpdateJourneyNode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      journeyId,
      nodeId,
      node,
    }: {
      journeyId: string;
      nodeId: string;
      node: Partial<JourneyNode>;
    }) => {
      const response = await apiClient.put(`/journeys/${journeyId}/nodes/${nodeId}`, node);
      return response.data as JourneyNode;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['journeys', variables.journeyId] });
    },
  });
}

export function useDeleteJourneyNode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ journeyId, nodeId }: { journeyId: string; nodeId: string }) => {
      await apiClient.delete(`/journeys/${journeyId}/nodes/${nodeId}`);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['journeys', variables.journeyId] });
    },
  });
}

export function useEnrollContactInJourney() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      journeyId,
      contactId,
      enrollmentSource,
    }: {
      journeyId: string;
      contactId: string;
      enrollmentSource?: 'manual' | 'webhook' | 'segment' | 'campaign';
    }) => {
      const response = await apiClient.post(`/journeys/${journeyId}/enroll`, {
        contactId,
        enrollmentSource: enrollmentSource || 'manual',
      });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['journeys', variables.journeyId] });
      queryClient.invalidateQueries({ queryKey: ['journeys', variables.journeyId, 'contacts'] });
      queryClient.invalidateQueries({ queryKey: ['journeys'] });
    },
  });
}

export function useRemoveContactFromJourney() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      journeyId,
      contactId,
      pause,
    }: {
      journeyId: string;
      contactId: string;
      pause?: boolean;
    }) => {
      await apiClient.post(`/journeys/${journeyId}/remove-contact/${contactId}`, { pause });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['journeys', variables.journeyId] });
      queryClient.invalidateQueries({ queryKey: ['journeys', variables.journeyId, 'contacts'] });
      queryClient.invalidateQueries({ queryKey: ['journeys'] });
    },
  });
}

export function useJourneyRemovalCriteria(journeyId: string) {
  return useQuery({
    queryKey: ['journeys', journeyId, 'removal-criteria'],
    queryFn: async () => {
      const response = await apiClient.get(`/journeys/${journeyId}/removal-criteria`);
      return response.data;
    },
    enabled: !!journeyId,
  });
}

export function useUpdateJourneyRemovalCriteria() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      journeyId,
      removalCriteria,
    }: {
      journeyId: string;
      removalCriteria: any;
    }) => {
      const response = await apiClient.put(`/journeys/${journeyId}/removal-criteria`, {
        removalCriteria,
      });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['journeys', variables.journeyId] });
      queryClient.invalidateQueries({ queryKey: ['journeys', variables.journeyId, 'removal-criteria'] });
      queryClient.invalidateQueries({ queryKey: ['journeys', variables.journeyId, 'removal-criteria', 'webhook-url'] });
    },
  });
}

export function useJourneyWebhookUrl(journeyId: string) {
  return useQuery({
    queryKey: ['journeys', journeyId, 'removal-criteria', 'webhook-url'],
    queryFn: async () => {
      // Determine base URL based on current hostname
      let baseUrl: string;
      
      if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        const protocol = window.location.protocol === 'https:' ? 'https' : 'http';
        
        // If accessing via app.nurtureengine.net or leads.nurtureengine.net, use api.nurtureengine.net
        if (hostname === 'app.nurtureengine.net' || hostname === 'leads.nurtureengine.net') {
          baseUrl = 'https://api.nurtureengine.net';
        } else if (hostname.includes('nurtureengine.net')) {
          baseUrl = 'https://api.nurtureengine.net';
        } else {
          // For localhost or IP addresses, use the same hostname with port 5002
          baseUrl = `${protocol}//${hostname}:5002`;
        }
      } else {
        // Server-side: use environment variable or default
        baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5002';
      }
      
      // Ensure baseUrl doesn't have trailing slash
      baseUrl = baseUrl.replace(/\/$/, '');
      
      const params = new URLSearchParams({ baseUrl });
      const url = `/journeys/${journeyId}/removal-criteria/webhook-url?${params.toString()}`;
      const response = await apiClient.get(url);
      return response.data as string | null;
    },
    enabled: !!journeyId,
  });
}

export function useGenerateJourneyWebhookToken() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ journeyId }: { journeyId: string }) => {
      const response = await apiClient.post(`/journeys/${journeyId}/removal-criteria/generate-webhook-token`);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['journeys', variables.journeyId, 'removal-criteria'] });
      queryClient.invalidateQueries({ queryKey: ['journeys', variables.journeyId, 'removal-criteria', 'webhook-url'] });
    },
  });
}

export interface JourneyExecution {
  id: string;
  nodeId: string;
  nodeType: string;
  nodeName: string;
  status: 'PENDING' | 'EXECUTING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
  scheduledAt: string;
  executedAt?: string;
  completedAt?: string;
  result?: {
    success?: boolean;
    action?: string;
    message?: string;
    error?: string;
    messageSid?: string;
    to?: string;
    campaignId?: string;
    campaignName?: string;
    delayValue?: number;
    delayUnit?: string;
    nextNodeId?: string;
    // Enhanced execution logging
    ivrAudioPreviewUrl?: string;
    ivrFilePath?: string;
    didUsed?: string;
    didId?: string;
    previousAction?: string;
    previousNodeId?: string;
    previousNodeName?: string;
    outcome?: string;
    outcomeDetails?: string;
    callUniqueId?: string;
    callStatus?: string;
  };
}

export function useJourneyExecutions(journeyId: string, contactId: string) {
  return useQuery({
    queryKey: ['journeys', journeyId, 'executions', contactId],
    queryFn: async () => {
      const response = await apiClient.get(`/journeys/${journeyId}/executions/${contactId}`);
      return response.data as JourneyExecution[];
    },
    enabled: !!journeyId && !!contactId,
  });
}

export interface ContactJourneyExecution extends JourneyExecution {
  journeyId: string;
  journeyName: string;
}

export function useContactJourneyExecutions(contactId: string) {
  return useQuery({
    queryKey: ['journeys', 'contact', contactId, 'executions'],
    queryFn: async () => {
      const response = await apiClient.get(`/journeys/contact/${contactId}/executions`);
      return response.data as ContactJourneyExecution[];
    },
    enabled: !!contactId,
  });
}

export function useGenerateTtsAudioForExecution() {
  return useMutation({
    mutationFn: async (executionId: string) => {
      const response = await apiClient.post(`/journeys/executions/${executionId}/generate-audio`);
      return response.data as { audioUrl: string; audioDataUrl?: string; duration?: number };
    },
  });
}

export interface JourneyContact {
  id: string;
  journeyId: string;
  contactId: string;
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'REMOVED';
  currentNodeId?: string;
  enrolledAt: string;
  completedAt?: string;
  pausedAt?: string;
  removedAt?: string;
  contact: {
    id: string;
    phoneNumber: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  };
}

export interface JourneyContactsResponse {
  contacts: JourneyContact[];
  total: number;
  page: number;
  limit: number;
}

export function useJourneyContacts(
  journeyId: string,
  page: number = 1,
  limit: number = 50,
  sortBy?: string,
  sortOrder: 'ASC' | 'DESC' = 'DESC',
  search?: string,
) {
  return useQuery({
    queryKey: ['journeys', journeyId, 'contacts', page, limit, sortBy, sortOrder, search],
    queryFn: async () => {
      const params: any = { page, limit };
      if (sortBy) params.sortBy = sortBy;
      if (sortOrder) params.sortOrder = sortOrder;
      if (search) params.search = search;
      const response = await apiClient.get(`/journeys/${journeyId}/contacts`, { params });
      return response.data as JourneyContactsResponse;
    },
    enabled: !!journeyId,
  });
}

