import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';

export interface VoicePreset {
  id: string;
  name: string;
  description?: string;
  kokoroVoiceId: string;
  kokoroVoiceName?: string;
  customVoiceName?: string;
  voiceConfig?: {
    stability?: number;
    similarityBoost?: number;
    style?: number;
    useSpeakerBoost?: boolean;
    speed?: number;
    speedVariance?: number;
    pitch?: number;
    volume?: number;
    pauseDuration?: number;
    emphasisStrength?: number;
    prosodyLevel?: number;
  };
  tags: string[];
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVoicePresetDto {
  name: string;
  description?: string;
  kokoroVoiceId: string;
  kokoroVoiceName?: string;
  customVoiceName?: string;
  voiceConfig?: {
    stability?: number;
    similarityBoost?: number;
    style?: number;
    useSpeakerBoost?: boolean;
    speed?: number;
    speedVariance?: number;
    pitch?: number;
    volume?: number;
    pauseDuration?: number;
    emphasisStrength?: number;
    prosodyLevel?: number;
  };
  tags?: string[];
  isDefault?: boolean;
  isActive?: boolean;
}

export function useVoicePresets() {
  return useQuery({
    queryKey: ['voice-presets'],
    queryFn: async () => {
      const response = await apiClient.get('/voice-presets');
      return Array.isArray(response.data) ? response.data : [];
    },
  });
}

export function useVoicePreset(id: string) {
  return useQuery({
    queryKey: ['voice-presets', id],
    queryFn: async () => {
      const response = await apiClient.get(`/voice-presets/${id}`);
      return response.data as VoicePreset;
    },
    enabled: !!id,
  });
}

export function useDefaultVoicePreset() {
  return useQuery({
    queryKey: ['voice-presets', 'default'],
    queryFn: async () => {
      const response = await apiClient.get('/voice-presets/default');
      return response.data as VoicePreset | null;
    },
  });
}

export function useCreateVoicePreset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateVoicePresetDto) => {
      const response = await apiClient.post('/voice-presets', data);
      return response.data as VoicePreset;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voice-presets'] });
    },
  });
}

export function useUpdateVoicePreset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateVoicePresetDto> }) => {
      const response = await apiClient.put(`/voice-presets/${id}`, data);
      return response.data as VoicePreset;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voice-presets'] });
    },
  });
}

export function useDeleteVoicePreset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/voice-presets/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voice-presets'] });
    },
  });
}

export function useSetDefaultVoicePreset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.put(`/voice-presets/${id}/set-default`);
      return response.data as VoicePreset;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voice-presets'] });
    },
  });
}
