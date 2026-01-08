import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../common/base.entity';
import { Tenant } from './tenant.entity';

@Entity('voice_presets')
export class VoicePreset extends BaseEntity {
  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column()
  kokoroVoiceId: string; // Kokoro voice ID

  @Column({ nullable: true })
  kokoroVoiceName: string; // Human-readable voice name

  @Column({ nullable: true })
  customVoiceName: string; // Custom name for the AI agent (used in templates/journeys)

  @Column({ type: 'jsonb', nullable: true })
  voiceConfig: {
    stability?: number; // 0-1
    similarityBoost?: number; // 0-1
    style?: number; // 0-1
    useSpeakerBoost?: boolean;
    speed?: number; // Speech speed (default: 1.0)
    speedVariance?: number; // Speed variance for natural variation (0-0.5)
    pitch?: number; // Pitch shift in semitones (-12 to +12, default: 0)
    volume?: number; // Volume/gain multiplier (0.0 to 2.0, default: 1.0)
    pauseDuration?: number; // Pause duration between phrases in seconds (0.0 to 2.0, default: 0.5)
    emphasisStrength?: number; // Emphasis tag strength (0.0 to 1.0, default: 0.5)
    prosodyLevel?: number; // Overall prosody/expressiveness (0.0 to 1.0, default: 0.5)
  };

  @Column({ type: 'jsonb', default: [] })
  tags: string[]; // Supported tags like ['breathe', 'excited', 'whisper', 'loud', 'slow', 'fast']

  @Column({ default: false })
  isDefault: boolean; // Whether this is the default preset for the tenant

  @Column({ default: true })
  isActive: boolean;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;
}
