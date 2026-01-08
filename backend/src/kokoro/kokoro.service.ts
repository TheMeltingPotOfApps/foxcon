import { Injectable, Logger, BadRequestException, OnModuleInit } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';
import { ConfigService } from '../config/config.service';
import axios, { AxiosInstance } from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import * as https from 'https';

export interface KokoroVoice {
  voice_id: string;
  name: string;
  category: string;
  description?: string;
  preview_url?: string;
}

export interface KokoroVoiceConfig {
  stability?: number; // 0-1
  similarity_boost?: number; // 0-1
  style?: number; // 0-1
  use_speaker_boost?: boolean;
  speed?: number; // Speech speed (default: 1.0)
  speed_variance?: number; // Speed variance for natural variation (0-0.5)
  pitch?: number; // Pitch shift in semitones (-12 to +12, default: 0)
  volume?: number; // Volume/gain multiplier (0.0 to 2.0, default: 1.0)
  pause_duration?: number; // Pause duration between phrases in seconds (0.0 to 2.0, default: 0.5)
  emphasis_strength?: number; // Emphasis tag strength (0.0 to 1.0, default: 0.5)
  prosody_level?: number; // Overall prosody/expressiveness (0.0 to 1.0, default: 0.5)
}

export interface GenerateAudioOptions {
  text: string;
  voiceId: string;
  voiceConfig?: KokoroVoiceConfig;
}

interface QueuedRequest {
  options: GenerateAudioOptions;
  resolve: (value: { audioBuffer: Buffer; audioUrl?: string; duration?: number }) => void;
  reject: (error: Error) => void;
}

@Injectable()
export class KokoroService implements OnModuleInit {
  private readonly logger = new Logger(KokoroService.name);
  private apiUrl: string = 'http://localhost:8000/v1';
  private axiosInstance: AxiosInstance;
  
  // Circuit breaker state
  private circuitBreakerState: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private circuitBreakerFailures = 0;
  private circuitBreakerLastFailureTime = 0;
  private readonly CIRCUIT_BREAKER_THRESHOLD = 5; // Open after 5 failures
  private readonly CIRCUIT_BREAKER_TIMEOUT = 60000; // 60 seconds before trying again
  private readonly CIRCUIT_BREAKER_SUCCESS_THRESHOLD = 2; // Need 2 successes to close
  
  // Request queue and concurrency control
  private requestQueue: QueuedRequest[] = [];
  private activeRequests = 0;
  private readonly MAX_CONCURRENT_REQUESTS = 10; // Increased from 3 to 10 for better throughput
  private readonly REQUEST_TIMEOUT = 60000; // 60 seconds timeout
  
  // Retry configuration
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY_BASE = 1000; // 1 second base delay

  constructor(
    private nestConfigService: NestConfigService,
    private configService: ConfigService,
  ) {
    // Create axios instance with connection pooling for better performance
    this.axiosInstance = axios.create({
      timeout: this.REQUEST_TIMEOUT,
      httpAgent: new http.Agent({
        keepAlive: true,
        keepAliveMsecs: 1000,
        maxSockets: 50,
        maxFreeSockets: 10,
      }),
      httpsAgent: new https.Agent({
        keepAlive: true,
        keepAliveMsecs: 1000,
        maxSockets: 50,
        maxFreeSockets: 10,
      }),
      maxRedirects: 5,
    });
  }

  async onModuleInit() {
    // Get Kokoro API URL from config, default to localhost:8000
    const configUrl = await this.configService.get('KOKORO_API_URL') ||
                     this.nestConfigService.get<string>('KOKORO_API_URL');
    if (configUrl) {
      this.apiUrl = configUrl.endsWith('/v1') ? configUrl : `${configUrl}/v1`;
    }
    
    this.logger.log(`Kokoro TTS API URL: ${this.apiUrl}`);
    
    // Test connection (non-blocking - don't fail module initialization)
    this.getVoices().then(() => {
      this.logger.log('Kokoro TTS API connection successful');
    }).catch((error) => {
      this.logger.warn('Kokoro TTS API connection failed - ensure the Kokoro API server is running. Error: ' + (error?.message || 'Unknown error'));
    });
  }

  async getApiUrl(): Promise<string> {
    const configUrl = await this.configService.get('KOKORO_API_URL') ||
                     this.nestConfigService.get<string>('KOKORO_API_URL');
    if (configUrl) {
      return configUrl.endsWith('/v1') ? configUrl : `${configUrl}/v1`;
    }
    return this.apiUrl;
  }

  async getVoices(): Promise<KokoroVoice[]> {
    try {
      const apiUrl = await this.getApiUrl();
      const response = await this.axiosInstance.get(`${apiUrl}/voices`, {
        timeout: 10000,
      });
      return response.data.voices || [];
    } catch (error: any) {
      this.logger.error('Failed to fetch Kokoro voices', error.response?.data || error.message);
      throw new BadRequestException('Failed to fetch voices from Kokoro TTS. Ensure the Kokoro API server is running at ' + this.apiUrl);
    }
  }

  async getVoice(voiceId: string): Promise<KokoroVoice> {
    try {
      const apiUrl = await this.getApiUrl();
      const response = await this.axiosInstance.get(`${apiUrl}/voices/${voiceId}`, {
        timeout: 10000,
      });
      return response.data;
    } catch (error: any) {
      this.logger.error(`Failed to fetch voice ${voiceId}`, error.response?.data || error.message);
      throw new BadRequestException(`Failed to fetch voice: ${error.response?.data?.detail || error.message}`);
    }
  }

  async generateAudio(
    options: GenerateAudioOptions,
  ): Promise<{ audioBuffer: Buffer; audioUrl?: string; duration?: number }> {
    const { text, voiceId, voiceConfig } = options;

    if (!text || !voiceId) {
      throw new BadRequestException('Text and voiceId are required');
    }

    // Log audio generation request with context
    const context = (options as any).context || 'unknown';
    const requestId = (options as any).requestId || 'unknown';
    this.logger.debug(`[Kokoro TTS] Audio generation request - Context: ${context}, Request ID: ${requestId}, Voice ID: ${voiceId}, Text length: ${text.length}`);

    // Check circuit breaker
    if (this.circuitBreakerState === 'OPEN') {
      const timeSinceLastFailure = Date.now() - this.circuitBreakerLastFailureTime;
      if (timeSinceLastFailure < this.CIRCUIT_BREAKER_TIMEOUT) {
        throw new BadRequestException(
          `TTS service is temporarily unavailable. Please try again in ${Math.ceil((this.CIRCUIT_BREAKER_TIMEOUT - timeSinceLastFailure) / 1000)} seconds.`
        );
      } else {
        // Try half-open state
        this.circuitBreakerState = 'HALF_OPEN';
        this.circuitBreakerFailures = 0;
        this.logger.log('Circuit breaker entering HALF_OPEN state');
      }
    }

    // Queue request if at concurrency limit
    if (this.activeRequests >= this.MAX_CONCURRENT_REQUESTS) {
      return new Promise((resolve, reject) => {
        this.requestQueue.push({ options, resolve, reject });
        this.logger.debug(`Request queued. Queue length: ${this.requestQueue.length}, Active: ${this.activeRequests}`);
      });
    }

    return this.executeRequest(options);
  }

  private async executeRequest(
    options: GenerateAudioOptions,
  ): Promise<{ audioBuffer: Buffer; audioUrl?: string; duration?: number }> {
    const { text, voiceId, voiceConfig } = options;
    this.activeRequests++;

    try {
      const result = await this.generateAudioWithRetry(options);
      
      // Success - reset circuit breaker if in HALF_OPEN
      if (this.circuitBreakerState === 'HALF_OPEN') {
        this.circuitBreakerFailures++;
        if (this.circuitBreakerFailures >= this.CIRCUIT_BREAKER_SUCCESS_THRESHOLD) {
          this.circuitBreakerState = 'CLOSED';
          this.circuitBreakerFailures = 0;
          this.logger.log('Circuit breaker CLOSED - service recovered');
        }
      } else {
        // Reset failures on success
        this.circuitBreakerFailures = 0;
      }

      return result;
    } catch (error) {
      // Handle failure
      this.handleCircuitBreakerFailure();
      throw error;
    } finally {
      this.activeRequests--;
      // Process next queued request
      this.processQueue();
    }
  }

  private async generateAudioWithRetry(
    options: GenerateAudioOptions,
  ): Promise<{ audioBuffer: Buffer; audioUrl?: string; duration?: number }> {
    const { text, voiceId, voiceConfig } = options;
    let lastError: any;

    for (let attempt = 0; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        const apiUrl = await this.getApiUrl();
        
        const requestConfig: any = {
          text,
          stability: voiceConfig?.stability ?? 0.5,
          similarity_boost: voiceConfig?.similarity_boost ?? 0.75,
          style: voiceConfig?.style ?? 0.0,
          use_speaker_boost: voiceConfig?.use_speaker_boost ?? true,
        };
        
        if (voiceConfig?.speed !== undefined) {
          requestConfig.speed = voiceConfig.speed;
        }
        if (voiceConfig?.speed_variance !== undefined) {
          requestConfig.speed_variance = voiceConfig.speed_variance;
        }

        const response = await this.axiosInstance.post(
          `${apiUrl}/text-to-speech/${voiceId}`,
          requestConfig,
          {
            headers: {
              'Content-Type': 'application/json',
            },
            responseType: 'arraybuffer',
            timeout: this.REQUEST_TIMEOUT,
          },
        );

        const audioBuffer = Buffer.from(response.data);
        const wordCount = text.split(/\s+/).length;
        const estimatedDuration = (wordCount / 150) * 60;

        if (attempt > 0) {
          this.logger.log(`TTS generation succeeded on attempt ${attempt + 1}`);
        }

        return {
          audioBuffer,
          duration: estimatedDuration,
        };
      } catch (error: any) {
        lastError = error;
        
        // Don't retry on certain errors
        if (error.response?.status === 400 || error.response?.status === 404) {
          throw this.formatError(error, voiceId, text);
        }

        // Calculate retry delay with exponential backoff
        if (attempt < this.MAX_RETRIES) {
          const delay = this.RETRY_DELAY_BASE * Math.pow(2, attempt);
          this.logger.warn(
            `TTS generation failed (attempt ${attempt + 1}/${this.MAX_RETRIES + 1}). Retrying in ${delay}ms...`,
            { error: error.message, voiceId, textLength: text.length }
          );
          await this.sleep(delay);
        }
      }
    }

    // All retries failed
    this.logger.error('TTS generation failed after all retries', {
      error: lastError?.response?.data || lastError?.message,
      voiceId,
      textLength: text.length,
      attempts: this.MAX_RETRIES + 1,
    });

    throw this.formatError(lastError, voiceId, text);
  }

  private formatError(error: any, voiceId: string, text: string): BadRequestException {
    let errorMessage = 'Failed to generate audio';
    
    if (error.response?.data) {
      const errorData = error.response.data;
      if (Buffer.isBuffer(errorData)) {
        try {
          const errorText = errorData.toString('utf-8');
          const parsed = JSON.parse(errorText);
          if (parsed.detail) {
            errorMessage = parsed.detail;
          } else if (parsed.message) {
            errorMessage = parsed.message;
          }
        } catch (e) {
          errorMessage = errorData.toString('utf-8').substring(0, 200);
        }
      } else if (errorData.detail?.message) {
        errorMessage = errorData.detail.message;
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
    
    if (error.code === 'ECONNREFUSED' || error.message?.includes('connect')) {
      errorMessage = 'Cannot connect to Kokoro TTS API. Ensure the Kokoro API server is running.';
    } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      errorMessage = 'TTS generation timed out. The request took too long to complete.';
    } else if (error.response?.status === 500) {
      if (errorMessage.includes('Hub') || errorMessage.includes('HuggingFace') || errorMessage.includes('cache')) {
        errorMessage = 'Kokoro TTS model files are missing or cannot be downloaded. Please ensure the model files are available locally or check your internet connection.';
      }
    }
    
    return new BadRequestException(`Failed to generate audio: ${errorMessage}`);
  }

  private handleCircuitBreakerFailure(): void {
    this.circuitBreakerFailures++;
    this.circuitBreakerLastFailureTime = Date.now();

    if (this.circuitBreakerState === 'HALF_OPEN') {
      // Failed in half-open, go back to open
      this.circuitBreakerState = 'OPEN';
      this.logger.warn('Circuit breaker OPEN - service still failing');
    } else if (this.circuitBreakerFailures >= this.CIRCUIT_BREAKER_THRESHOLD) {
      this.circuitBreakerState = 'OPEN';
      this.logger.error(`Circuit breaker OPEN after ${this.circuitBreakerFailures} failures`);
    }
  }

  private processQueue(): void {
    if (this.requestQueue.length > 0 && this.activeRequests < this.MAX_CONCURRENT_REQUESTS) {
      const nextRequest = this.requestQueue.shift();
      if (nextRequest) {
        this.executeRequest(nextRequest.options)
          .then(nextRequest.resolve)
          .catch(nextRequest.reject);
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async previewAudio(
    text: string,
    voiceId: string,
    voiceConfig?: KokoroVoiceConfig,
  ): Promise<{ audioBuffer: Buffer; audioUrl: string; audioDataUrl?: string; duration?: number }> {
    const result = await this.generateAudio({ text, voiceId, voiceConfig });
    
    // Convert audio buffer to base64 data URL for direct playback
    const base64Audio = result.audioBuffer.toString('base64');
    const audioDataUrl = `data:audio/wav;base64,${base64Audio}`;
    
    // Also save file for potential future use
    const filename = `preview_${Date.now()}.wav`;
    await this.saveAudioFile(result.audioBuffer, filename);
    const audioUrl = `/uploads/audio/${filename}`;
    
    return {
      ...result,
      audioUrl,
      audioDataUrl, // Return base64 data URL for direct playback
    };
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
    // Kokoro is free/open-source, so we use minimal credits
    // For consistency with existing system: 1 credit per second of audio
    if (duration) {
      return Math.ceil(duration); // 1 credit per second
    }
    // Fallback to character-based calculation
    return Math.ceil(text.length / 100); // 1 credit per 100 characters
  }
}
