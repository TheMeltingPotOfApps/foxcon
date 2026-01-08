import { Controller, Get, Param, Post, Body, UseGuards } from '@nestjs/common';
import { KokoroService } from './kokoro.service';
import { AudioProcessingService } from '../audio-processing/audio-processing.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';

@Controller('kokoro')
@UseGuards(JwtAuthGuard, TenantGuard)
export class KokoroController {
  constructor(
    private readonly kokoroService: KokoroService,
    private readonly audioProcessingService: AudioProcessingService,
  ) {}

  @Get('voices')
  async getVoices() {
    const voices = await this.kokoroService.getVoices();
    return { voices };
  }

  @Get('voices/:id')
  async getVoice(@Param('id') id: string) {
    return this.kokoroService.getVoice(id);
  }

  @Post('preview')
  async previewAudio(
    @Body() body: {
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
    },
  ) {
    let { audioBuffer, audioUrl, audioDataUrl, duration } = await this.kokoroService.previewAudio(
      body.text,
      body.voiceId,
      body.voiceConfig,
    );

    // Apply audio effects if provided
    if (body.audioEffects) {
      try {
        audioBuffer = await this.audioProcessingService.processAudio(
          audioBuffer,
          24000, // Kokoro sample rate
          body.audioEffects,
        );
        // Regenerate data URL with processed audio
        const base64Audio = audioBuffer.toString('base64');
        audioDataUrl = `data:audio/wav;base64,${base64Audio}`;
      } catch (error) {
        // Log error but don't fail - return original audio
        console.warn('Failed to apply audio effects to preview:', error);
      }
    }
    
    return {
      audioUrl,
      audioDataUrl, // Base64 data URL for direct playback
      duration,
      fileSize: audioBuffer.length,
    };
  }
}
