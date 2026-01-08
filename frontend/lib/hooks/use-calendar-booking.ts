import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '../api/client';

export interface BookingEventType {
  id: string;
  name: string;
  description?: string;
  durationMinutes?: number;
  tenantId?: string;
}

export interface BookingAvailability {
  id: string;
  weeklySchedule: any;
  startDate?: string;
  endDate?: string;
  maxEventsPerSlot?: number;
  assignedToUserId?: string;
}

export interface BookingData {
  eventType: BookingEventType;
  availabilities: BookingAvailability[];
}

export function useBookingEventType(eventTypeId: string, contactId?: string, leadId?: string) {
  return useQuery({
    queryKey: ['booking-event-type', eventTypeId, contactId, leadId],
    queryFn: async () => {
      const params: any = {};
      if (leadId) {
        params.leadId = leadId;
      } else if (contactId) {
        params.contactId = contactId;
      }
      const response = await apiClient.get(`/calendar/booking/event-type/${eventTypeId}`, { params });
      return response.data as BookingData;
    },
    enabled: !!eventTypeId,
  });
}

export function useAvailableBookingSlots(
  eventTypeId: string,
  startDate: Date,
  endDate: Date,
  assignedToUserId?: string,
  timezone?: string,
) {
  return useQuery({
    queryKey: ['available-booking-slots', eventTypeId, startDate.toISOString(), endDate.toISOString(), assignedToUserId, timezone],
    queryFn: async () => {
      const params: any = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };
      // Only pass assignedToUserId if it's a valid non-empty string
      // Don't pass null or undefined (which would filter out "all users" availability)
      if (assignedToUserId && assignedToUserId !== 'null' && assignedToUserId !== 'undefined') {
        params.assignedToUserId = assignedToUserId;
      }
      if (timezone) {
        params.timezone = timezone;
      }
      const response = await apiClient.get(`/calendar/booking/available-slots/${eventTypeId}`, { params });
      return response.data as Date[];
    },
    enabled: !!eventTypeId,
  });
}

export function useCreateBooking() {
  return useMutation({
    mutationFn: async (data: {
      eventTypeId: string;
      contactId?: string;
      leadId?: string;
      startTime: string;
      endTime: string;
      attendeeName: string;
      attendeeEmail: string;
      attendeePhone?: string;
      attendeeCompany?: string;
      timezone?: string;
      tenantId: string;
    }) => {
      const response = await apiClient.post('/calendar/booking/book', data);
      return response.data;
    },
  });
}

export function useTrackVisit() {
  return useMutation({
    mutationFn: async (data: {
      contactId: string;
      eventTypeId: string;
      tenantId: string;
    }) => {
      const response = await apiClient.post('/calendar/booking/track-visit', data);
      return response.data;
    },
  });
}

