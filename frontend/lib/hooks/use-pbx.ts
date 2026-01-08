import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { useAuthStore } from '../../store/auth-store';

// Agent Extensions
export function useAgentExtensions() {
  const { tenantId } = useAuthStore();
  return useQuery({
    queryKey: ['pbx', 'agent-extensions', tenantId],
    queryFn: async () => {
      const { data } = await apiClient.get('/pbx/agent-extensions');
      return data;
    },
    enabled: !!tenantId,
  });
}

export function useCreateAgentExtension() {
  const queryClient = useQueryClient();
  const { tenantId } = useAuthStore();
  return useMutation({
    mutationFn: async (dto: any) => {
      const { data } = await apiClient.post('/pbx/agent-extensions', dto);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['pbx', 'agent-extensions', tenantId],
      });
    },
  });
}

export function useUpdateAgentStatus() {
  const queryClient = useQueryClient();
  const { tenantId } = useAuthStore();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data } = await apiClient.put(`/pbx/agent-extensions/${id}/status`, {
        status,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['pbx', 'agent-extensions', tenantId],
      });
    },
  });
}

// Call Sessions
export function useCallSessions(options?: {
  agentId?: string;
  status?: string;
  limit?: number;
  offset?: number;
}) {
  const { tenantId } = useAuthStore();
  return useQuery({
    queryKey: ['pbx', 'call-sessions', tenantId, options],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options?.agentId) params.append('agentId', options.agentId);
      if (options?.status) params.append('status', options.status);
      if (options?.limit) params.append('limit', options.limit.toString());
      if (options?.offset) params.append('offset', options.offset.toString());
      const { data } = await apiClient.get(
        `/pbx/calls/sessions?${params.toString()}`,
      );
      return data;
    },
    enabled: !!tenantId,
  });
}

export function useDialCall() {
  const queryClient = useQueryClient();
  const { tenantId } = useAuthStore();
  return useMutation({
    mutationFn: async (dto: { phoneNumber: string; contactId?: string }) => {
      const { data } = await apiClient.post('/pbx/calls/dial', dto);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['pbx', 'call-sessions', tenantId],
      });
    },
  });
}

export function useAnswerCall() {
  const queryClient = useQueryClient();
  const { tenantId } = useAuthStore();
  return useMutation({
    mutationFn: async (callId: string) => {
      const { data } = await apiClient.post(`/pbx/calls/${callId}/answer`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['pbx', 'call-sessions', tenantId],
      });
    },
  });
}

export function useHangupCall() {
  const queryClient = useQueryClient();
  const { tenantId } = useAuthStore();
  return useMutation({
    mutationFn: async (callId: string) => {
      const { data } = await apiClient.post(`/pbx/calls/${callId}/hangup`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['pbx', 'call-sessions', tenantId],
      });
    },
  });
}

export function useUpdateCallNotes() {
  const queryClient = useQueryClient();
  const { tenantId } = useAuthStore();
  return useMutation({
    mutationFn: async (dto: {
      callId: string;
      notes?: string;
      disposition?: string;
    }) => {
      const { data } = await apiClient.put(`/pbx/calls/${dto.callId}/notes`, {
        notes: dto.notes,
        disposition: dto.disposition,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['pbx', 'call-sessions', tenantId],
      });
    },
  });
}

// Queues
export function useQueues() {
  const { tenantId } = useAuthStore();
  return useQuery({
    queryKey: ['pbx', 'queues', tenantId],
    queryFn: async () => {
      const { data } = await apiClient.get('/pbx/queues');
      return data;
    },
    enabled: !!tenantId,
  });
}

export function useQueueStatus(queueId: string) {
  const { tenantId } = useAuthStore();
  return useQuery({
    queryKey: ['pbx', 'queues', tenantId, queueId, 'status'],
    queryFn: async () => {
      const { data } = await apiClient.get(`/pbx/queues/${queueId}/status`);
      return data;
    },
    enabled: !!tenantId && !!queueId,
    refetchInterval: 5000, // Refresh every 5 seconds
  });
}

// Reporting
export function useRealTimeStats() {
  const { tenantId } = useAuthStore();
  return useQuery({
    queryKey: ['pbx', 'reporting', 'realtime', tenantId],
    queryFn: async () => {
      const { data } = await apiClient.get('/pbx/reporting/realtime');
      return data;
    },
    enabled: !!tenantId,
    refetchInterval: 5000, // Refresh every 5 seconds
  });
}

export function useAgentMetrics(
  agentId: string,
  startDate: string,
  endDate: string,
) {
  const { tenantId } = useAuthStore();
  return useQuery({
    queryKey: ['pbx', 'reporting', 'agent', tenantId, agentId, startDate, endDate],
    queryFn: async () => {
      const { data } = await apiClient.get(
        `/pbx/reporting/agent/${agentId}/metrics?startDate=${startDate}&endDate=${endDate}`,
      );
      return data;
    },
    enabled: !!tenantId && !!agentId && !!startDate && !!endDate,
  });
}

export function useTeamMetrics(startDate: string, endDate: string) {
  const { tenantId } = useAuthStore();
  return useQuery({
    queryKey: ['pbx', 'reporting', 'team', tenantId, startDate, endDate],
    queryFn: async () => {
      const { data } = await apiClient.get(
        `/pbx/reporting/team/metrics?startDate=${startDate}&endDate=${endDate}`,
      );
      return data;
    },
    enabled: !!tenantId && !!startDate && !!endDate,
  });
}

