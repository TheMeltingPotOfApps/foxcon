import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';

export interface AiTemplate {
  id: string;
  name: string;
  description?: string;
  config: {
    purpose?: string[];
    productInfo?: string;
    serviceInfo?: string;
    qualificationGuidelines?: string;
    brandTonality?: string;
    welcomeMessage?: string;
    customInstructions?: string;
    businessName?: string;
    phoneNumber?: string;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAiTemplateDto {
  name: string;
  description?: string;
  config: {
    purpose?: string[];
    productInfo?: string;
    serviceInfo?: string;
    qualificationGuidelines?: string;
    brandTonality?: string;
    welcomeMessage?: string;
    customInstructions?: string;
    businessName?: string;
    phoneNumber?: string;
  };
  isActive?: boolean;
}

export function useAiTemplates() {
  return useQuery({
    queryKey: ['ai-templates'],
    queryFn: async () => {
      const response = await apiClient.get('/ai-templates');
      return Array.isArray(response.data) ? response.data : [];
    },
  });
}

export function useAiTemplate(id: string) {
  return useQuery({
    queryKey: ['ai-templates', id],
    queryFn: async () => {
      const response = await apiClient.get(`/ai-templates/${id}`);
      return response.data as AiTemplate;
    },
    enabled: !!id,
  });
}

export function useCreateAiTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateAiTemplateDto) => {
      const response = await apiClient.post('/ai-templates', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-templates'] });
    },
  });
}

export function useUpdateAiTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateAiTemplateDto> }) => {
      const response = await apiClient.put(`/ai-templates/${id}`, data);
      return response.data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['ai-templates'] });
      queryClient.invalidateQueries({ queryKey: ['ai-templates', id] });
    },
  });
}

export function useDeleteAiTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/ai-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-templates'] });
    },
  });
}

