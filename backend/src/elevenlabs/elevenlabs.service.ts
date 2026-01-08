import { Injectable, Logger, BadRequestException, OnModuleInit } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';
import { ConfigService } from '../config/config.service';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category: string;
  description?: string;
  preview_url?: string;
}

export interface ElevenLabsVoiceConfig {
  stability?: number; // 0-1
  similarity_boost?: number; // 0-1
  style?: number; // 0-1
  use_speaker_boost?: boolean;
}

export interface GenerateAudioOptions {
  text: string;
  voiceId: string;
  voiceConfig?: ElevenLabsVoiceConfig;
}

@Injectable()
export class ElevenLabsService implements OnModuleInit {
  private readonly logger = new Logger(ElevenLabsService.name);
  private apiKey: string = '';
  private readonly apiUrl = 'https://api.elevenlabs.io/v1';

  constructor(
    private nestConfigService: NestConfigService,
    private configService: ConfigService,
  ) {}

  async onModuleInit() {
    // Try to get from database first, fallback to env
    this.apiKey = (await this.configService.get('ELEVENLABS_API_KEY')) || 
                  this.nestConfigService.get<string>('ELEVENLABS_API_KEY') || '';
    
    if (!this.apiKey) {
      this.logger.warn('ELEVENLABS_API_KEY not configured');
    } else {
      this.logger.log('ElevenLabs API key loaded');
    }
  }

  async getApiKey(): Promise<string> {
    // Always reload from database to get latest value
    // This allows API key to be updated without restarting the service
    const dbKey = await this.configService.get('ELEVENLABS_API_KEY');
    const envKey = this.nestConfigService.get<string>('ELEVENLABS_API_KEY') || '';
    this.apiKey = dbKey || envKey;
    
    if (!this.apiKey) {
      this.logger.warn('ELEVENLABS_API_KEY not configured');
    } else {
      // Log first few characters for debugging (without exposing full key)
      const keyPreview = this.apiKey.length > 10 ? `${this.apiKey.substring(0, 10)}...` : '***';
      this.logger.debug(`Using ElevenLabs API key: ${keyPreview} (length: ${this.apiKey.length})`);
    }
    
    return this.apiKey;
  }

  async refreshApiKey(): Promise<void> {
    // Force refresh the API key from database
    this.apiKey = '';
    
    // Reload configs to clear cache and get latest value
    await this.configService.loadConfigs();
    
    const newKey = await this.getApiKey();
    if (newKey) {
      this.logger.log(`ElevenLabs API key refreshed (length: ${newKey.length})`);
    } else {
      this.logger.warn('ElevenLabs API key refresh returned empty key');
    }
  }

  async getVoices(): Promise<ElevenLabsVoice[]> {
    try {
      const apiKey = await this.getApiKey();
      const response = await axios.get(`${this.apiUrl}/voices`, {
        headers: {
          'xi-api-key': apiKey,
        },
      });
      return response.data.voices || [];
    } catch (error: any) {
      this.logger.error('Failed to fetch ElevenLabs voices', error.response?.data || error.message);
      throw new BadRequestException('Failed to fetch voices from ElevenLabs');
    }
  }

  async getVoice(voiceId: string): Promise<ElevenLabsVoice> {
    try {
      const apiKey = await this.getApiKey();
      const response = await axios.get(`${this.apiUrl}/voices/${voiceId}`, {
        headers: {
          'xi-api-key': apiKey,
        },
      });
      return response.data;
    } catch (error: any) {
      this.logger.error(`Failed to fetch voice ${voiceId}`, error.response?.data || error.message);
      throw new BadRequestException(`Failed to fetch voice: ${error.response?.data?.detail?.message || error.message}`);
    }
  }

  async generateAudio(
    options: GenerateAudioOptions,
  ): Promise<{ audioBuffer: Buffer; audioUrl?: string; duration?: number }> {
    const { text, voiceId, voiceConfig } = options;

    if (!text || !voiceId) {
      throw new BadRequestException('Text and voiceId are required');
    }

    try {
      const requestConfig: any = {
        text,
        voice_settings: {
          stability: voiceConfig?.stability ?? 0.5,
          similarity_boost: voiceConfig?.similarity_boost ?? 0.75,
          style: voiceConfig?.style ?? 0.0,
          use_speaker_boost: voiceConfig?.use_speaker_boost ?? true,
        },
      };

      const apiKey = await this.getApiKey();
      
      // Retry logic with exponential backoff
      const MAX_RETRIES = 2;
      const RETRY_DELAY_BASE = 1000;
      const REQUEST_TIMEOUT = 60000; // 60 seconds (reduced from 180s)
      
      let lastError: any;
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          const response = await axios.post(
            `${this.apiUrl}/text-to-speech/${voiceId}`,
            requestConfig,
            {
              headers: {
                'xi-api-key': apiKey,
                'Content-Type': 'application/json',
              },
              responseType: 'arraybuffer',
              timeout: REQUEST_TIMEOUT,
            },
          );

          const audioBuffer = Buffer.from(response.data);

          // Calculate duration (rough estimate: ~150 words per minute, average word length 5 chars)
          const wordCount = text.split(/\s+/).length;
          const estimatedDuration = (wordCount / 150) * 60; // seconds

          if (attempt > 0) {
            this.logger.log(`ElevenLabs TTS generation succeeded on attempt ${attempt + 1}`);
          }

          return {
            audioBuffer,
            duration: estimatedDuration,
          };
        } catch (error: any) {
          lastError = error;
          
          // Don't retry on client errors (400, 401, 404, 429)
          if (error.response?.status && [400, 401, 404, 429].includes(error.response.status)) {
            break;
          }
          
          // Retry on server errors or network issues
          if (attempt < MAX_RETRIES) {
            const delay = RETRY_DELAY_BASE * Math.pow(2, attempt);
            this.logger.warn(
              `ElevenLabs TTS generation failed (attempt ${attempt + 1}/${MAX_RETRIES + 1}). Retrying in ${delay}ms...`,
              { error: error.message, voiceId, textLength: text.length }
            );
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
      
      // All retries failed
      throw lastError;
    } catch (error: any) {
      this.logger.error('Failed to generate audio', {
        error: error.response?.data || error.message,
        voiceId,
        textLength: text.length,
        statusCode: error.response?.status,
      });
      
      // Extract error message from ElevenLabs response
      let errorMessage = 'Failed to generate audio';
      if (error.response?.data) {
        const errorData = error.response.data;
        // Handle nested detail object (common in ElevenLabs API)
        if (errorData.detail?.message) {
          errorMessage = errorData.detail.message;
        } else if (errorData.detail?.status === 'quota_exceeded') {
          errorMessage = `ElevenLabs quota exceeded: ${errorData.detail.message || 'No credits remaining'}`;
        } else if (typeof errorData.detail === 'string') {
          errorMessage = errorData.detail;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        } else if (typeof errorData === 'string') {
          errorMessage = errorData;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Provide more specific error messages based on status code
      if (error.response?.status === 401) {
        errorMessage = 'ElevenLabs API key is invalid or expired. Please check your API key configuration.';
      } else if (error.response?.status === 429 || errorMessage.includes('quota')) {
        errorMessage = `ElevenLabs quota exceeded: ${errorMessage}`;
      }
      
      throw new BadRequestException(`Failed to generate audio: ${errorMessage}`);
    }
  }

  async saveAudioFile(audioBuffer: Buffer, filename: string): Promise<string> {
    const uploadsDir = path.join(process.cwd(), 'uploads', 'audio');
    
    // Ensure directory exists
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filePath = path.join(uploadsDir, filename);
    fs.writeFileSync(filePath, audioBuffer);

    return filePath;
  }

  calculateCredits(text: string, duration?: number): number {
    // ElevenLabs pricing: typically ~$0.30 per 1000 characters
    // For simplicity, we'll use: 1 credit = 100 characters
    // Or use duration: 1 credit per second of audio
    if (duration) {
      return Math.ceil(duration); // 1 credit per second
    }
    // Fallback to character-based calculation
    return Math.ceil(text.length / 100); // 1 credit per 100 characters
  }
}

