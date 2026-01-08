import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { apiClient } from '../api/client';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  type: 'SALES_CALL' | 'DEMO' | 'SUPPORT' | 'INTERNAL';
  startTime: string;
  endTime: string;
  attendeeName?: string;
  attendeeEmail?: string;
  attendeePhone?: string;
  attendeeCompany?: string;
  meetingLink?: string;
  timezone?: string;
  status: 'SCHEDULED' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  assignedToUserId?: string;
  eventTypeId?: string;
  contactId?: string;
  journeyId?: string;
  createdAt: string;
  updatedAt: string;
}

export function useCalendarEvents(filters?: {
  assignedToUserId?: string;
  startDate?: Date;
  endDate?: Date;
  status?: string;
  type?: string;
  contactId?: string;
}) {
  // Extract date strings to create stable dependencies
  const startDateStr = filters?.startDate?.toISOString();
  const endDateStr = filters?.endDate?.toISOString();
  
  // Create a stable query key to prevent React hooks error #185
  const queryKey = useMemo(() => {
    const key: any[] = ['calendar-events'];
    if (filters?.assignedToUserId) key.push('assignedToUserId', filters.assignedToUserId);
    if (startDateStr) key.push('startDate', startDateStr);
    if (endDateStr) key.push('endDate', endDateStr);
    if (filters?.status) key.push('status', filters.status);
    if (filters?.type) key.push('type', filters.type);
    if (filters?.contactId) key.push('contactId', filters.contactId);
    return key;
  }, [
    filters?.assignedToUserId,
    startDateStr,
    endDateStr,
    filters?.status,
    filters?.type,
    filters?.contactId,
  ]);

  return useQuery({
    queryKey,
    queryFn: async () => {
      const params: any = {};
      if (filters?.assignedToUserId) params.assignedToUserId = filters.assignedToUserId;
      if (filters?.startDate) params.startDate = filters.startDate.toISOString();
      if (filters?.endDate) params.endDate = filters.endDate.toISOString();
      if (filters?.status) params.status = filters.status;
      if (filters?.type) params.type = filters.type;
      if (filters?.contactId) params.contactId = filters.contactId;
      
      const response = await apiClient.get('/calendar/events', { params });
      return response.data as CalendarEvent[];
    },
  });
}

export function useCalendarEvent(id: string) {
  return useQuery({
    queryKey: ['calendar-events', id],
    queryFn: async () => {
      const response = await apiClient.get(`/calendar/events/${id}`);
      return response.data as CalendarEvent;
    },
    enabled: !!id,
  });
}

export function useCreateCalendarEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<CalendarEvent>) => {
      const response = await apiClient.post('/calendar/events', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
    },
  });
}

export function useUpdateCalendarEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CalendarEvent> }) => {
      const response = await apiClient.put(`/calendar/events/${id}`, data);
      return response.data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-events', id] });
    },
  });
}

export function useCancelCalendarEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const response = await apiClient.delete(`/calendar/events/${id}`, {
        params: { reason },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
    },
  });
}

