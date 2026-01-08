import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';

export interface DashboardStats {
  messagesSent: number;
  messagesDelivered: number;
  messagesFailed: number;
  deliveryRate: number;
  replies: number;
  aiUsage: number;
  qualifiedLeads: number;
  openConversations: number;
  callsPlaced: number;
  callsAnswered: number;
  callsFailed: number; // Failed calls (excluding NO_ANSWER)
  callAnswerRate: number;
  transfersAttempted: number;
  transfersCompleted: number;
  transferRate: number; // Percentage of answered calls that resulted in transfers
  totalContacts: number;
  optedOutContacts: number;
  leadsIngested: number; // Count of contacts created
  contactRateByLeadAge: {
    age0to7: { total: number; answered: number; rate: number };
    age8to14: { total: number; answered: number; rate: number };
    age15to30: { total: number; answered: number; rate: number };
    age31plus: { total: number; answered: number; rate: number };
  };
  totalCallDuration: number;
  averageCallDuration: number;
}

export interface JourneyActivityLog {
  id: string;
  nodeId: string;
  nodeName: string;
  nodeType: string;
  contactId: string;
  contactName: string;
  contactPhone: string;
  status: string;
  scheduledAt: string;
  executedAt?: string;
  completedAt?: string;
  result?: any;
  journeyDay?: number;
  callNumber?: number;
}

export function useDashboardStats(timeRange?: 'today' | 'week' | 'month' | 'all') {
  return useQuery({
    queryKey: ['dashboard', 'stats', timeRange || 'all'],
    queryFn: async () => {
      const params = timeRange && timeRange !== 'all' ? { timeRange } : {};
      const response = await apiClient.get<DashboardStats>('/dashboard/stats', { params });
      return response.data;
    },
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
  });
}

export function useJourneyActivityLogs(journeyId: string, limit?: number) {
  return useQuery({
    queryKey: ['dashboard', 'journey-activity-logs', journeyId, limit],
    queryFn: async () => {
      const params = limit ? { limit: limit.toString() } : {};
      const response = await apiClient.get<JourneyActivityLog[]>(`/dashboard/journey/${journeyId}/activity-logs`, { params });
      return response.data;
    },
    enabled: !!journeyId,
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
  });
}

