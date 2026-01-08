import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';

export interface Template {
  id: string;
  name: string;
  type: 'OUTREACH' | 'REPLY' | 'AI_PROMPT' | 'SYSTEM';
  category?: string;
  content: string;
  variables?: string[];
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export function useTemplates(type?: string) {
  return useQuery({
    queryKey: ['templates', type],
    queryFn: async () => {
      const params = type ? `?type=${type}` : '';
      const response = await apiClient.get(`/templates${params}`);
      return Array.isArray(response.data) ? response.data : [];
    },
  });
}

export function useTemplate(id: string) {
  return useQuery({
    queryKey: ['templates', id],
    queryFn: async () => {
      const response = await apiClient.get(`/templates/${id}`);
      return response.data as Template;
    },
    enabled: !!id,
  });
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Template>) => {
      const response = await apiClient.post('/templates', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Template> }) => {
      const response = await apiClient.put(`/templates/${id}`, data);
      return response.data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      queryClient.invalidateQueries({ queryKey: ['templates', id] });
    },
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });
}

