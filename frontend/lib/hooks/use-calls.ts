import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';

export interface CallLog {
  id: string;
  tenantId: string;
  from: string;
  to: string;
  transferNumber?: string;
  trunk?: string;
  context?: string;
  uniqueId?: string;
  destinationNumber?: string;
  callerId?: string;
  phoneNumber?: string;
  didUsed?: string;
  status: 'initiated' | 'connected' | 'answered' | 'failed' | 'completed' | 'no_answer';
  callStatus: 'initiated' | 'connected' | 'answered' | 'failed' | 'completed' | 'no_answer';
  disposition?: 'ANSWERED' | 'NO_ANSWER' | 'BUSY' | 'FAILED' | 'CANCELLED';
  duration?: number;
  billableSeconds?: number;
  callFlowEvents?: Array<{
    type: string;
    timestamp: Date;
    data: any;
  }>;
  metadata?: {
    ivrFile?: string;
    voicemailFile?: string;
    waitStrategy?: string;
    pressKey?: string;
    amdEnabled?: boolean;
    transferPrefix?: string;
    customCallId?: string;
    channel?: string;
    answerTime?: Date;
    bridgeTime?: Date;
    transferStatus?: string;
    transferBillableSeconds?: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface MakeCallDto {
  to: string;
  from: string;
  context?: string;
}

export interface MakeCallResponse {
  success: boolean;
  callId?: string;
  asteriskUniqueId?: string;
  callDetails?: {
    brand?: {
      name?: string;
      phoneId?: string;
    };
    did?: {
      number?: string;
      usageCount?: number;
      maxUsage?: number;
      areaCode?: string;
    };
    to?: string;
    from?: string;
    transferNumber?: string;
    trunk?: string;
    context?: string;
  };
  amiResponse?: {
    success: boolean;
    uniqueId?: string;
    status?: string;
  };
  message?: string;
}

export function useCallLogs(options?: { limit?: number; offset?: number; status?: string }) {
  return useQuery({
    queryKey: ['callLogs', options],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options?.limit) params.append('limit', options.limit.toString());
      if (options?.offset) params.append('offset', options.offset.toString());
      if (options?.status) params.append('status', options.status);

      const response = await apiClient.get(`/calls/logs?${params.toString()}`);
      return response.data as { data: CallLog[]; total: number };
    },
  });
}

export function useCallLog(id: string) {
  return useQuery({
    queryKey: ['callLog', id],
    queryFn: async () => {
      const response = await apiClient.get(`/calls/logs/${id}`);
      return response.data as CallLog;
    },
    enabled: !!id,
  });
}

export function useMakeCall() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: MakeCallDto) => {
      const response = await apiClient.post('/calls/make-call', data);
      return response.data as MakeCallResponse;
    },
    onSuccess: () => {
      // Invalidate call logs to refresh the list
      queryClient.invalidateQueries({ queryKey: ['callLogs'] });
    },
  });
}

export interface VoiceAudioFile {
  name: string;
  path: string;
  size: number;
  format: string;
  createdAt: string;
}

export interface VoiceDid {
  id: string;
  number: string;
  areaCode?: string;
  trunk: string;
  status: string;
  usageCount: number;
  maxUsage?: number;
  lastUsed?: string;
  metadata?: any;
}

export function useVoiceAudioFiles() {
  return useQuery({
    queryKey: ['voice-audio-files'],
    queryFn: async () => {
      const response = await apiClient.get('/asterisk-sounds/list');
      return response.data.data as VoiceAudioFile[];
    },
  });
}

export function useDidPools() {
  return useQuery({
    queryKey: ['asterisk-dids', 'pools'],
    queryFn: async () => {
      const response = await apiClient.get('/asterisk-dids/pools');
      return response.data as {
        mc: { count: number; segments: string[]; dids: any[] };
        twilio: { count: number; segments: string[]; dids: any[] };
      };
    },
  });
}

export function useVoiceDids(status?: string) {
  return useQuery({
    queryKey: ['voice-dids', status],
    queryFn: async () => {
      const params = status ? `?status=${status}` : '';
      const response = await apiClient.get(`/asterisk-dids${params}`);
      return response.data as VoiceDid[];
    },
  });
}

export function useCreateVoiceDid() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<VoiceDid>) => {
      const response = await apiClient.post('/asterisk-dids', data);
      return response.data as VoiceDid;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voice-dids'] });
    },
  });
}

export function useUpdateVoiceDid() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<VoiceDid> }) => {
      const response = await apiClient.put(`/asterisk-dids/${id}`, data);
      return response.data as VoiceDid;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voice-dids'] });
    },
  });
}

export function useDeleteVoiceDid() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/asterisk-dids/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voice-dids'] });
    },
  });
}

export function useImportVoiceDids() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await apiClient.post('/asterisk-dids/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voice-dids'] });
    },
  });
}

// Legacy aliases for backward compatibility
export const useAsteriskAudioFiles = useVoiceAudioFiles;
export const useAsteriskDids = useVoiceDids;
export type AsteriskAudioFile = VoiceAudioFile;
export type AsteriskDid = VoiceDid;

