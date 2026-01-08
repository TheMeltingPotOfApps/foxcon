import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';

export type AfterHoursAction = 'RESCHEDULE_NEXT_AVAILABLE' | 'RESCHEDULE_NEXT_BUSINESS_DAY' | 'RESCHEDULE_SPECIFIC_TIME' | 'SKIP_NODE' | 'PAUSE_JOURNEY' | 'DEFAULT_EVENT';
export type TcpaviolationAction = 'RESCHEDULE_NEXT_AVAILABLE' | 'RESCHEDULE_NEXT_BUSINESS_DAY' | 'SKIP_NODE' | 'PAUSE_JOURNEY' | 'DEFAULT_EVENT' | 'BLOCK';
export type ResubmissionAction = 'SKIP_DUPLICATE' | 'RESCHEDULE_DELAY' | 'PAUSE_JOURNEY' | 'DEFAULT_EVENT' | 'CONTINUE';

export interface ExecutionRules {
  id: string;
  tenantId: string;
  afterHoursAction: AfterHoursAction;
  afterHoursRescheduleTime?: string;
  afterHoursDefaultEventTypeId?: string;
  afterHoursBusinessHours?: {
    startHour: number;
    endHour: number;
    daysOfWeek: string[];
    timezone?: string;
  };
  tcpaViolationAction: TcpaviolationAction;
  tcpaRescheduleTime?: string;
  tcpaDefaultEventTypeId?: string;
  tcpaRescheduleDelayHours?: number;
  resubmissionAction: ResubmissionAction;
  resubmissionDetectionWindowHours: number;
  resubmissionDefaultEventTypeId?: string;
  resubmissionRescheduleDelayHours?: number;
  enableAfterHoursHandling: boolean;
  enableTcpaviolationHandling: boolean;
  enableResubmissionHandling: boolean;
  createdAt: string;
  updatedAt: string;
}

export function useExecutionRules() {
  return useQuery({
    queryKey: ['execution-rules'],
    queryFn: async () => {
      const response = await apiClient.get<ExecutionRules>('/execution-rules');
      return response.data;
    },
  });
}

export function useUpdateExecutionRules() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<ExecutionRules>) => {
      const response = await apiClient.put<ExecutionRules>('/execution-rules', updates);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['execution-rules'] });
    },
  });
}

