import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../common/base.entity';
import { Tenant } from './tenant.entity';
import { VoicePreset } from './voice-preset.entity';

@Entity('voice_templates')
export class VoiceTemplate extends BaseEntity {
  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'text' })
  messageContent: string; // Template with variables like {firstName}, {lastName}

  @Column({ nullable: true })
  kokoroVoiceId: string; // Kokoro voice ID (formerly elevenLabsVoiceId)

  @Column({ nullable: true })
  kokoroVoiceName: string; // Human-readable voice name (formerly elevenLabsVoiceName)

  @Column({ nullable: true })
  elevenLabsVoiceId: string; // Legacy field for backward compatibility

  @Column({ nullable: true })
  elevenLabsVoiceName: string; // Legacy field for backward compatibility

  @Column({ nullable: true })
  voicePresetId?: string; // Reference to voice preset

  @ManyToOne(() => VoicePreset, { nullable: true, eager: false })
  @JoinColumn({ name: 'voicePresetId' })
  voicePreset?: VoicePreset;

  @Column({ type: 'jsonb', nullable: true })
  voiceConfig: {
    stability?: number; // 0-1
    similarityBoost?: number; // 0-1
    style?: number; // 0-1
    useSpeakerBoost?: boolean;
    speed?: number; // Speech speed
    speedVariance?: number; // Speed variance
  };

  @Column({ type: 'jsonb', nullable: true })
  audioEffects: {
    distance?: 'close' | 'medium' | 'far'; // Distance effect (affects reverb/echo)
    backgroundNoise?: {
      enabled: boolean;
      volume?: number; // 0-1, volume of background noise relative to speech
      file?: string; // Background noise file name (default: office-quiet-work-ambience)
    };
    volume?: number; // Overall volume 0-1 (default: 1.0)
    coughEffects?: Array<{
      file: 'stifled-cough' | 'coughing-woman' | 'coughing-woman-2'; // Which cough sound
      timestamp: number; // When to insert (seconds from start)
      volume?: number; // Volume of cough effect 0-1 (default: 0.5)
    }>;
  };

  @Column({ type: 'jsonb', nullable: true })
  variables: string[]; // List of variables used in messageContent, e.g., ['firstName', 'lastName']

  @Column({ default: true })
  isActive: boolean;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;
}

