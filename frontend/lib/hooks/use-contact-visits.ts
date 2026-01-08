import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';

export interface ContactVisit {
  id: string;
  contactId: string;
  eventTypeId?: string;
  eventType?: {
    id: string;
    name: string;
  };
  ipAddress?: string;
  userAgent?: string;
  referrer?: string;
  metadata?: Record<string, any>;
  scheduledEventAt?: string;
  createdAt: string;
  updatedAt: string;
}

export function useContactVisits(contactId: string) {
  return useQuery({
    queryKey: ['contact-visits', contactId],
    queryFn: async () => {
      const response = await apiClient.get(`/contacts/${contactId}/visits`);
      return response.data as ContactVisit[];
    },
    enabled: !!contactId,
  });
}

