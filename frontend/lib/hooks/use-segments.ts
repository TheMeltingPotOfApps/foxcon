import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';

export interface Segment {
  id: string;
  name: string;
  description?: string;
  criteria: Record<string, any>;
  continuousInclusion?: boolean;
  contactCount?: number;
  createdAt: string;
  updatedAt: string;
}

export function useSegments() {
  return useQuery({
    queryKey: ['segments'],
    queryFn: async () => {
      const response = await apiClient.get('/segments');
      return Array.isArray(response.data) ? response.data : [];
    },
  });
}

export function useSegment(id: string) {
  return useQuery({
    queryKey: ['segments', id],
    queryFn: async () => {
      const response = await apiClient.get(`/segments/${id}`);
      return response.data as Segment;
    },
    enabled: !!id,
  });
}

export function useCreateSegment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Segment>) => {
      const response = await apiClient.post('/segments', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['segments'] });
    },
  });
}

export function useUpdateSegment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Segment> }) => {
      const response = await apiClient.put(`/segments/${id}`, data);
      return response.data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['segments'] });
      queryClient.invalidateQueries({ queryKey: ['segments', id] });
    },
  });
}

export function useDeleteSegment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/segments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['segments'] });
    },
  });
}

export function useCountMatchingContacts() {
  return useMutation({
    mutationFn: async (criteria: Record<string, any>) => {
      const response = await apiClient.post('/segments/count-matching', { criteria });
      return response.data.count as number;
    },
  });
}

