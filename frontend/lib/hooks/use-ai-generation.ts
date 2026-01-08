import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../api/client';

export function useGenerateAiTemplateConfig() {
  return useMutation({
    mutationFn: async (businessCategory: string) => {
      const response = await apiClient.post('/ai-generation/generate-template-config', {
        businessCategory,
      });
      return response.data;
    },
  });
}

export function useGenerateSmsVariations() {
  return useMutation({
    mutationFn: async (sampleSms: string) => {
      const response = await apiClient.post('/ai-generation/generate-sms-variations', {
        sampleSms,
      });
      return response.data;
    },
  });
}

