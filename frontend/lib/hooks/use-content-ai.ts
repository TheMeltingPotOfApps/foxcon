import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';

export interface ContentAiTemplate {
  id: string;
  name: string;
  description?: string;
  journeyDescription?: string;
  exampleMessages: string[];
  generatedVariations?: string[];
  creativity: number;
  unique: boolean;
  config?: {
    maxUniqueGenerationsPerHour?: number;
    maxUniqueGenerationsPerDay?: number;
    maxLength?: number;
    preserveVariables?: boolean;
  };
  isActive: boolean;
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateContentAiTemplateDto {
  name: string;
  description?: string;
  journeyDescription?: string;
  exampleMessages: string[];
  creativity?: number;
  unique?: boolean;
  config?: {
    maxUniqueGenerationsPerHour?: number;
    maxUniqueGenerationsPerDay?: number;
    maxLength?: number;
    preserveVariables?: boolean;
  };
}

export function useContentAiTemplates() {
  return useQuery({
    queryKey: ['content-ai-templates'],
    queryFn: async () => {
      const response = await apiClient.get('/content-ai-templates');
      return Array.isArray(response.data) ? response.data : [];
    },
  });
}

export function useContentAiTemplate(id: string) {
  return useQuery({
    queryKey: ['content-ai-templates', id],
    queryFn: async () => {
      const response = await apiClient.get(`/content-ai-templates/${id}`);
      return response.data as ContentAiTemplate;
    },
    enabled: !!id,
  });
}

export function useCreateContentAiTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateContentAiTemplateDto) => {
      const response = await apiClient.post('/content-ai-templates', data);
      return response.data as ContentAiTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-ai-templates'] });
    },
  });
}

export function useUpdateContentAiTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateContentAiTemplateDto> }) => {
      const response = await apiClient.put(`/content-ai-templates/${id}`, data);
      return response.data as ContentAiTemplate;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['content-ai-templates'] });
      queryClient.invalidateQueries({ queryKey: ['content-ai-templates', variables.id] });
    },
  });
}

export function useDeleteContentAiTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/content-ai-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-ai-templates'] });
    },
  });
}

export function useGenerateContentAiVariations() {
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.post(`/content-ai-templates/${id}/generate-variations`);
      return response.data as string[];
    },
  });
}

export function useGenerateUniqueMessage() {
  return useMutation({
    mutationFn: async ({ 
      id, 
      context 
    }: { 
      id: string; 
      context?: { contact?: any; journey?: any; previousMessages?: string[] } 
    }) => {
      const response = await apiClient.post(`/content-ai-templates/${id}/generate-unique`, context || {});
      return response.data as string;
    },
  });
}

export function useGetRandomVariation() {
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.get(`/content-ai-templates/${id}/random-variation`);
      return response.data as string;
    },
  });
}

export interface JourneyAudioResult {
  script: string;
  audioUrl: string;
  audioFilePath: string;
  asteriskPath: string;
  durationSeconds: number;
  journeyAudioId: string;
}

export interface JourneyAudio {
  id: string;
  contentAiTemplateId: string;
  day: number;
  callNumber: number;
  characterIndex?: number;
  totalCharacters?: number;
  script: string;
  audioUrl: string;
  audioFilePath: string;
  durationSeconds?: number;
  metadata?: {
    asteriskPath?: string;
    elevenLabsVoiceId?: string;
  };
}

export function useGenerateJourneyAudio() {
  return useMutation({
    mutationFn: async ({
      id,
      day,
      callNumber,
      characterIndex,
      totalCharacters,
      elevenLabsVoiceId,
    }: {
      id: string;
      day: number;
      callNumber: number;
      characterIndex?: number;
      totalCharacters?: number;
      elevenLabsVoiceId?: string;
    }) => {
      const response = await apiClient.post(`/content-ai-templates/${id}/generate-journey-audio`, {
        day,
        callNumber,
        characterIndex,
        totalCharacters,
        elevenLabsVoiceId,
      });
      return response.data as JourneyAudioResult;
    },
  });
}

export function useJourneyAudioFiles(contentAiTemplateId: string | null) {
  return useQuery({
    queryKey: ['journey-audio', contentAiTemplateId],
    queryFn: async () => {
      if (!contentAiTemplateId) return [];
      const response = await apiClient.get(`/content-ai-templates/${contentAiTemplateId}/journey-audio`);
      return response.data as JourneyAudio[];
    },
    enabled: !!contentAiTemplateId,
  });
}

export function useGenerateJourneyAudioBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      totalDays,
      callsPerDay,
      totalCharacters,
      elevenLabsVoiceId,
    }: {
      id: string;
      totalDays: number;
      callsPerDay: number;
      totalCharacters?: number;
      elevenLabsVoiceId?: string;
    }) => {
      const response = await apiClient.post(`/content-ai-templates/${id}/generate-journey-audio-batch`, {
        totalDays,
        callsPerDay,
        totalCharacters,
        elevenLabsVoiceId,
      });
      return response.data as { generated: number; skipped: number; errors: string[] };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['journey-audio', variables.id] });
    },
  });
}

