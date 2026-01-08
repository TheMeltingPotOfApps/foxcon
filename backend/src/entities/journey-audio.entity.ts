import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../common/base.entity';
import { ContentAiTemplate } from './content-ai-template.entity';
import { Tenant } from './tenant.entity';

@Entity('journey_audio')
export class JourneyAudio extends BaseEntity {
  @Column('uuid')
  contentAiTemplateId: string;

  @Column({ type: 'int' })
  day: number; // Day number in the journey

  @Column({ type: 'int' })
  callNumber: number; // Call number on that day (1, 2, 3, etc.)

  @Column({ type: 'int', nullable: true })
  characterIndex?: number; // Character index if multiple characters (0-based)

  @Column({ type: 'int', nullable: true })
  totalCharacters?: number; // Total number of characters

  @Column({ type: 'text' })
  script: string; // The generated script text

  @Column()
  audioUrl: string; // URL to the generated audio file

  @Column({ nullable: true })
  audioFilePath: string; // Local file path (Asterisk-compatible WAV path)

  @Column({ type: 'bigint', default: 0 })
  fileSizeBytes: number;

  @Column({ type: 'float', nullable: true })
  durationSeconds: number;

  @Column({ default: 0 })
  usageCount: number; // How many times this audio has been used

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    elevenLabsVoiceId?: string;
    generationTime?: number; // milliseconds
    creditsUsed?: number;
    asteriskPath?: string; // Path for Asterisk (e.g., "custom/filename")
  };

  @ManyToOne(() => ContentAiTemplate)
  @JoinColumn({ name: 'contentAiTemplateId' })
  contentAiTemplate: ContentAiTemplate;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;
}

