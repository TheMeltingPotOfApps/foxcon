import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';

export enum DayOfWeek {
  MONDAY = 'MONDAY',
  TUESDAY = 'TUESDAY',
  WEDNESDAY = 'WEDNESDAY',
  THURSDAY = 'THURSDAY',
  FRIDAY = 'FRIDAY',
  SATURDAY = 'SATURDAY',
  SUNDAY = 'SUNDAY',
}

export interface Availability {
  id: string;
  eventTypeId: string;
  assignedToUserId?: string;
  weeklySchedule: {
    [key in DayOfWeek]?: {
      enabled: boolean;
      startTime: string;
      endTime: string;
      timezone?: string;
    };
  };
  startDate?: string;
  endDate?: string;
  blockedDates?: string[];
  maxEventsPerSlot?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export function useAvailabilities(eventTypeId?: string) {
  return useQuery({
    queryKey: ['availabilities', eventTypeId],
    queryFn: async () => {
      const params = eventTypeId ? { eventTypeId } : {};
      const response = await apiClient.get('/availability', { params });
      return response.data as Availability[];
    },
  });
}

export function useAvailableSlots(
  eventTypeId: string,
  startDate: Date,
  endDate: Date,
  assignedToUserId?: string,
) {
  return useQuery({
    queryKey: ['available-slots', eventTypeId, startDate.toISOString(), endDate.toISOString(), assignedToUserId],
    queryFn: async () => {
      const params: any = {
        eventTypeId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };
      if (assignedToUserId) {
        params.assignedToUserId = assignedToUserId;
      }
      const response = await apiClient.get('/availability/slots', { params });
      return response.data as Date[];
    },
    enabled: !!eventTypeId,
  });
}

export function useCreateAvailability() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Availability>) => {
      const response = await apiClient.post('/availability', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availabilities'] });
    },
  });
}

export function useUpdateAvailability() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Availability> }) => {
      const response = await apiClient.put(`/availability/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availabilities'] });
    },
  });
}

export function useDeleteAvailability() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/availability/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availabilities'] });
    },
  });
}

