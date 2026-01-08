import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../common/base.entity';
import { VoiceTemplate } from './voice-template.entity';
import { Tenant } from './tenant.entity';

@Entity('generated_audio')
export class GeneratedAudio extends BaseEntity {
  @Column('uuid')
  voiceTemplateId: string;

  @Column({ type: 'jsonb' })
  variableValues: Record<string, string>; // e.g., { firstName: 'John', lastName: 'Doe' }

  @Column()
  audioUrl: string; // URL to the generated audio file

  @Column({ nullable: true })
  audioFilePath: string; // Local file path if stored locally

  @Column({ type: 'bigint', default: 0 })
  fileSizeBytes: number;

  @Column({ type: 'float', nullable: true })
  durationSeconds: number;

  @Column({ default: 0 })
  usageCount: number; // How many times this audio has been used

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    elevenLabsRequestId?: string;
    generationTime?: number; // milliseconds
    creditsUsed?: number;
  };

  @ManyToOne(() => VoiceTemplate)
  @JoinColumn({ name: 'voiceTemplateId' })
  voiceTemplate: VoiceTemplate;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;
}

