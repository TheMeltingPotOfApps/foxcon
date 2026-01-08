import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';

export interface EventAction {
  type: 'ADD_TO_JOURNEY' | 'UPDATE_CONTACT_STATUS' | 'SEND_SMS' | 'CREATE_TASK';
  config: {
    journeyId?: string;
    status?: string;
    message?: string;
    taskTitle?: string;
    taskDescription?: string;
  };
}

export interface ReminderSettings {
  enabled: boolean;
  reminders: Array<{
    minutesBefore: number;
    message?: string;
    journeyId?: string;
  }>;
}

export interface EventType {
  id: string;
  name: string;
  description?: string;
  durationMinutes?: number;
  aiTemplateId?: string;
  actions?: EventAction[];
  reminderSettings?: ReminderSettings;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export function useEventTypes() {
  return useQuery({
    queryKey: ['event-types'],
    queryFn: async () => {
      const response = await apiClient.get('/event-types');
      return response.data as EventType[];
    },
  });
}

export function useEventType(id: string) {
  return useQuery({
    queryKey: ['event-types', id],
    queryFn: async () => {
      const response = await apiClient.get(`/event-types/${id}`);
      return response.data as EventType;
    },
    enabled: !!id,
  });
}

export function useCreateEventType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<EventType>) => {
      const response = await apiClient.post('/event-types', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-types'] });
    },
  });
}

export function useUpdateEventType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<EventType> }) => {
      const response = await apiClient.put(`/event-types/${id}`, data);
      return response.data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['event-types'] });
      queryClient.invalidateQueries({ queryKey: ['event-types', id] });
    },
  });
}

export function useDeleteEventType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/event-types/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-types'] });
    },
  });
}

