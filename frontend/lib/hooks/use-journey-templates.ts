import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { apiClient } from '../api/client';
import { toast } from 'sonner';

export interface JourneyTemplate {
  id: string;
  name: string;
  description?: string;
  category: string;
  isPublic: boolean;
  journeyData: any;
  metadata?: any;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export function useJourneyTemplates(filters?: {
  category?: string;
  isPublic?: boolean;
  search?: string;
}) {
  // Create a stable query key to prevent React hooks error #185
  const queryKey = useMemo(() => {
    const key: any[] = ['journey-templates'];
    if (filters?.category) key.push('category', filters.category);
    if (filters?.isPublic !== undefined) key.push('isPublic', filters.isPublic);
    if (filters?.search) key.push('search', filters.search);
    return key;
  }, [filters?.category, filters?.isPublic, filters?.search]);

  return useQuery<JourneyTemplate[]>({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.category) params.append('category', filters.category);
      if (filters?.isPublic !== undefined) params.append('isPublic', String(filters.isPublic));
      if (filters?.search) params.append('search', filters.search);
      
      const response = await apiClient.get(`/journey-templates?${params.toString()}`);
      return response.data;
    },
  });
}

export function usePublicJourneyTemplates(filters?: {
  category?: string;
  search?: string;
}) {
  // Create a stable query key to prevent React hooks error #185
  const queryKey = useMemo(() => {
    const key: any[] = ['journey-templates', 'public'];
    if (filters?.category) key.push('category', filters.category);
    if (filters?.search) key.push('search', filters.search);
    return key;
  }, [filters?.category, filters?.search]);

  return useQuery<JourneyTemplate[]>({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.category) params.append('category', filters.category);
      if (filters?.search) params.append('search', filters.search);
      
      const response = await apiClient.get(`/journey-templates/public?${params.toString()}`);
      return response.data;
    },
  });
}

export function useJourneyTemplate(id: string) {
  return useQuery<JourneyTemplate>({
    queryKey: ['journey-template', id],
    queryFn: async () => {
      const response = await apiClient.get(`/journey-templates/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreateJourneyFromTemplate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { templateId: string; name?: string; description?: string }) => {
      const response = await apiClient.post(`/journey-templates/${data.templateId}/create-journey`, {
        name: data.name,
        description: data.description,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journeys'] });
      toast.success('Journey created from template successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create journey from template');
    },
  });
}

export function useCreateJourneyTemplate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Partial<JourneyTemplate>) => {
      const response = await apiClient.post('/journey-templates', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journey-templates'] });
      toast.success('Template created successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create template');
    },
  });
}

export function useDeleteJourneyTemplate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/journey-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journey-templates'] });
      toast.success('Template deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete template');
    },
  });
}

export function useGeneratePreviewScript() {
  return useMutation({
    mutationFn: async (data: {
      industry: string;
      brandName: string;
      marketingAngle: 'corporate' | 'personable' | 'psa';
      sentiment: 'kind' | 'caring' | 'concerned' | 'excited';
      voiceTemplateId?: string; // Optional if voicePresetId is provided
      voicePresetId?: string; // Optional if voiceTemplateId is provided
      includeContactName: boolean;
    }) => {
      const response = await apiClient.post('/journey-templates/generate-preview-script', data);
      return response.data as { script: string; agentName: string };
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || 
                          error?.response?.data?.error?.message ||
                          error?.message || 
                          'Failed to generate preview script';
      toast.error(typeof errorMessage === 'string' ? errorMessage : 'Failed to generate preview script');
    },
  });
}

export interface GenerationJob {
  id: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  generationParams: any;
  templateId?: string;
  journeyId?: string;
  errorMessage?: string;
  progress?: {
    currentDay?: number;
    totalDays?: number;
    currentCall?: number;
    totalCalls?: number;
    currentStep?: string;
    percentage?: number;
  };
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export function useGenerationJobStatus(jobId: string | null) {
  return useQuery<GenerationJob>({
    queryKey: ['generation-job', jobId],
    queryFn: async () => {
      if (!jobId) throw new Error('Job ID is required');
      const response = await apiClient.get(`/journey-templates/generation-job/${jobId}`);
      return response.data;
    },
    enabled: !!jobId,
    refetchInterval: (query) => {
      const data = query.state.data;
      // Poll every 2 seconds if job is pending or processing
      if (data?.status === 'PENDING' || data?.status === 'PROCESSING') {
        return 2000;
      }
      // Stop polling if completed or failed
      return false;
    },
  });
}

export function useGenerateAiPoweredJourneyTemplate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: {
      industry: string;
      brandName: string;
      totalDays: number;
      callsPerDay: number;
      restPeriodDays: number[];
      includeSms: boolean;
      marketingAngle: 'corporate' | 'personable' | 'psa';
      sentiment: 'kind' | 'caring' | 'concerned' | 'excited';
      voiceTemplateId?: string; // Optional if voicePresetId is provided
      voicePresetId?: string; // Optional if voiceTemplateId is provided
      numberOfVoices: number;
      includeContactName: boolean;
      audioEffects?: {
        distance?: 'close' | 'medium' | 'far';
        backgroundNoise?: {
          enabled: boolean;
          volume?: number;
          file?: string;
        };
        volume?: number;
        coughEffects?: Array<{
          file: 'stifled-cough' | 'coughing-woman' | 'coughing-woman-2';
          timestamp: number;
          volume?: number;
        }>;
      };
      referenceScript?: string; // Optional: edited preview script
      temperature?: number; // AI temperature (0-1)
      journeyName?: string; // Journey name
      smsCta?: {
        type: 'none' | 'event' | 'phone' | 'ai';
        eventTypeId?: string;
        phoneNumber?: string;
        aiTemplateId?: string;
      };
      delayConfig?: {
        betweenCalls: Array<{ value: number; unit: 'MINUTES' | 'HOURS' }>;
        betweenCallAndSms: { value: number; unit: 'MINUTES' | 'HOURS' };
      };
      useBackgroundGeneration?: boolean; // Force background generation
    }) => {
      // Use shorter timeout since background generation returns immediately
      const response = await apiClient.post('/journey-templates/generate-ai-powered', data, {
        timeout: 60000, // 1 minute (should return quickly with jobId)
      });
      
      // Response can be either { template, journey } or { jobId }
      const responseData = response.data;
      if ('jobId' in responseData) {
        return { jobId: responseData.jobId } as { jobId: string };
      }
      return responseData as { template: JourneyTemplate; journey: any };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['journey-templates'] });
      if ('jobId' in data) {
        toast.success('Journey template generation started in the background. You will be notified when it completes.');
      } else {
        toast.success('Journey template generated successfully!');
      }
    },
    onError: (error: any) => {
      // Handle nested error message objects
      let errorMessage: string = 'Failed to generate journey template';
      
      if (error?.response?.data?.message) {
        const msg = error.response.data.message;
        if (typeof msg === 'string') {
          errorMessage = msg;
        } else if (typeof msg === 'object' && msg !== null) {
          // Handle nested message object (e.g., { message: "...", error: "...", statusCode: 400 })
          if ('message' in msg && typeof msg.message === 'string') {
            errorMessage = msg.message;
          } else {
            errorMessage = JSON.stringify(msg);
          }
        } else if (Array.isArray(msg)) {
          errorMessage = msg.join(', ');
        }
      } else if (error?.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    },
  });
}

