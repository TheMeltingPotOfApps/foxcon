import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';

export interface Tcpaconfig {
  id: string;
  tenantId: string;
  complianceMode: 'STRICT' | 'MODERATE' | 'PERMISSIVE';
  allowedStartHour: number;
  allowedEndHour: number;
  allowedDaysOfWeek?: string[];
  requireExpressConsent: boolean;
  requireConsentForAutomated: boolean;
  requireConsentForMarketing: boolean;
  consentExpirationDays?: number;
  honorOptOuts: boolean;
  honorDncList: boolean;
  autoOptOutOnStop: boolean;
  requireSenderIdentification: boolean;
  requiredSenderName?: string;
  violationAction: 'BLOCK' | 'LOG_ONLY' | 'PAUSE_JOURNEY' | 'SKIP_NODE';
  logViolations: boolean;
  notifyOnViolation: boolean;
  violationNotificationEmails?: string[];
  blockNonCompliantJourneys: boolean;
  allowManualOverride: boolean;
  overrideReasons?: string[];
  maintainConsentRecords: boolean;
  consentRecordRetentionDays: number;
  customRules?: {
    stateSpecificRules?: Record<string, any>;
    industrySpecificRules?: Record<string, any>;
    exemptions?: string[];
  };
  createdAt: string;
  updatedAt: string;
}

export interface Tcpaviolation {
  id: string;
  tenantId: string;
  contactId: string;
  violationType: string;
  description: string;
  status: 'BLOCKED' | 'LOGGED' | 'OVERRIDDEN' | 'RESOLVED';
  journeyId?: string;
  nodeId?: string;
  campaignId?: string;
  attemptedAction?: string;
  context?: any;
  overriddenBy?: string;
  overrideReason?: string;
  overrideNotes?: string;
  overriddenAt?: string;
  resolvedAt?: string;
  resolutionNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export function useTcpaconfig() {
  return useQuery({
    queryKey: ['tcpa', 'config'],
    queryFn: async () => {
      const response = await apiClient.get('/tcpa/config');
      return response.data as Tcpaconfig;
    },
  });
}

export function useUpdateTcpaconfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (updates: Partial<Tcpaconfig>) => {
      const response = await apiClient.put('/tcpa/config', updates);
      return response.data as Tcpaconfig;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tcpa', 'config'] });
    },
  });
}

export function useTcpaviolations(contactId?: string, journeyId?: string) {
  return useQuery({
    queryKey: ['tcpa', 'violations', contactId, journeyId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (contactId) params.append('contactId', contactId);
      if (journeyId) params.append('journeyId', journeyId);
      const url = params.toString() ? `/tcpa/violations?${params.toString()}` : '/tcpa/violations';
      const response = await apiClient.get(url);
      return response.data as Tcpaviolation[];
    },
  });
}

export function useOverrideTcpaviolation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      violationId,
      reason,
      notes,
      userId,
    }: {
      violationId: string;
      reason: string;
      notes?: string;
      userId: string;
    }) => {
      const response = await apiClient.post(`/tcpa/violations/${violationId}/override`, {
        reason,
        notes,
        userId,
      });
      return response.data as Tcpaviolation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tcpa', 'violations'] });
    },
  });
}

export function useCheckTcpacompliance() {
  return useMutation({
    mutationFn: async (data: {
      contactId: string;
      nodeType: string;
      journeyId?: string;
      nodeId?: string;
      campaignId?: string;
      messageContent?: string;
      isAutomated?: boolean;
      isMarketing?: boolean;
      scheduledTime?: Date;
    }) => {
      const response = await apiClient.post('/tcpa/check', data);
      return response.data;
    },
  });
}

