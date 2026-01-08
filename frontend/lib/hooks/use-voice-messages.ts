import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';

export interface KokoroVoice {
  voice_id: string;
  name: string;
  category: string;
  description?: string;
  preview_url?: string;
}

export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category: string;
  description?: string;
  preview_url?: string;
}

export interface VoiceTemplate {
  id: string;
  name: string;
  description?: string;
  messageContent: string;
  kokoroVoiceId: string;
  kokoroVoiceName?: string;
  elevenLabsVoiceId?: string; // Legacy field
  elevenLabsVoiceName?: string; // Legacy field
  voicePresetId?: string; // Reference to voice preset
  voicePreset?: {
    id: string;
    name: string;
    tags: string[];
  };
  voiceConfig?: {
    stability?: number;
    similarityBoost?: number;
    style?: number;
    useSpeakerBoost?: boolean;
    speed?: number;
    speedVariance?: number;
    pitch?: number;
    volume?: number;
    pauseDuration?: number;
    emphasisStrength?: number;
    prosodyLevel?: number;
  };
  variables: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVoiceTemplateDto {
  name: string;
  description?: string;
  messageContent: string;
  kokoroVoiceId?: string;
  kokoroVoiceName?: string;
  elevenLabsVoiceId?: string; // Legacy field for backward compatibility
  elevenLabsVoiceName?: string; // Legacy field for backward compatibility
  voicePresetId?: string; // Reference to voice preset
  voiceConfig?: {
    stability?: number;
    similarityBoost?: number;
    style?: number;
    useSpeakerBoost?: boolean;
    speed?: number;
    speedVariance?: number;
    pitch?: number;
    volume?: number;
    pauseDuration?: number;
    emphasisStrength?: number;
    prosodyLevel?: number;
  };
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
  isActive?: boolean;
}

export interface CampaignCostCalculation {
  totalContacts: number;
  uniqueAudioFiles: number;
  estimatedCredits: number;
  variableCombinations: Array<{
    variables: Record<string, string>;
    count: number;
  }>;
}

export function useKokoroVoices() {
  return useQuery({
    queryKey: ['kokoro-voices'],
    queryFn: async () => {
      const response = await apiClient.get('/kokoro/voices');
      // Backend returns { voices: [...] }
      if (response.data?.voices && Array.isArray(response.data.voices)) {
        return response.data.voices;
      }
      // Fallback: check if response.data is directly an array
      return Array.isArray(response.data) ? response.data : [];
    },
  });
}

export function useKokoroVoice(id: string) {
  return useQuery({
    queryKey: ['kokoro-voices', id],
    queryFn: async () => {
      const response = await apiClient.get(`/kokoro/voices/${id}`);
      return response.data as KokoroVoice;
    },
    enabled: !!id,
  });
}

// Legacy function names for backward compatibility
export function useElevenLabsVoices() {
  return useKokoroVoices();
}

export function useElevenLabsVoice(id: string) {
  return useKokoroVoice(id);
}

export function usePreviewKokoroAudio() {
  return useMutation({
    mutationFn: async (data: {
      text: string;
      voiceId: string;
      voiceConfig?: {
        stability?: number;
        similarity_boost?: number;
        style?: number;
        use_speaker_boost?: boolean;
        speed?: number;
        speed_variance?: number;
        pitch?: number;
        volume?: number;
        pause_duration?: number;
        emphasis_strength?: number;
        prosody_level?: number;
      };
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
    }) => {
      const response = await apiClient.post('/kokoro/preview', data);
      return response.data as {
        audioUrl: string;
        audioDataUrl?: string; // Base64 data URL for direct playback
        duration: number;
        fileSize: number;
      };
    },
  });
}

export function useVoiceTemplates() {
  return useQuery({
    queryKey: ['voice-templates'],
    queryFn: async () => {
      const response = await apiClient.get('/voice-messages/templates');
      return Array.isArray(response.data) ? response.data : [];
    },
  });
}

export function useVoiceTemplate(id: string) {
  return useQuery({
    queryKey: ['voice-templates', id],
    queryFn: async () => {
      const response = await apiClient.get(`/voice-messages/templates/${id}`);
      return response.data as VoiceTemplate;
    },
    enabled: !!id,
  });
}

export function usePreviewVoiceTemplate() {
  return useMutation({
    mutationFn: async ({ templateId, variableValues }: { templateId: string; variableValues?: Record<string, string> }) => {
      const response = await apiClient.post(`/voice-messages/templates/${templateId}/preview`, {
        variableValues: variableValues || {},
      });
      return response.data as {
        generatedAudioId: string;
        audioUrl: string;
        audioFilePath: string;
        durationSeconds: number;
        substitutedText: string;
      };
    },
  });
}

export function useCreateVoiceTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateVoiceTemplateDto) => {
      const response = await apiClient.post('/voice-messages/templates', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voice-templates'] });
    },
  });
}

export function useCalculateCampaignCost() {
  return useMutation({
    mutationFn: async (data: {
      campaignId: string;
      segmentId: string;
      voiceTemplateId: string;
    }) => {
      const response = await apiClient.post('/voice-messages/campaigns/calculate-cost', data);
      return response.data as CampaignCostCalculation;
    },
  });
}

export function useGenerateVoiceCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      campaignId: string;
      segmentId: string;
      voiceTemplateId: string;
      variableMappings?: Record<string, string>;
    }) => {
      const response = await apiClient.post('/voice-messages/campaigns/generate', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['voice-templates'] });
    },
  });
}

