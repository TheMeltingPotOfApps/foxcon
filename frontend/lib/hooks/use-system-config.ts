import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';

export interface SystemConfig {
  key: string;
  value: string;
}

export function useSystemConfig(key: string) {
  return useQuery({
    queryKey: ['system-config', key],
    queryFn: async () => {
      const response = await apiClient.get(`/config/${key}`);
      return response.data as SystemConfig;
    },
  });
}

export function useUpdateSystemConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ key, value, description }: { key: string; value: string; description?: string }) => {
      const response = await apiClient.put(`/config/${key}`, { value, description });
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate the config query to refetch
      queryClient.invalidateQueries({ queryKey: ['system-config', variables.key] });
      
      // If it's the ElevenLabs API key, also invalidate voices query
      if (variables.key === 'ELEVENLABS_API_KEY') {
        queryClient.invalidateQueries({ queryKey: ['elevenlabs-voices'] });
      }
    },
  });
}

