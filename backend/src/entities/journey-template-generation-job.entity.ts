import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../common/base.entity';
import { Tenant } from './tenant.entity';
import { JourneyTemplate } from './journey-template.entity';
import { Journey } from './journey.entity';

export enum GenerationJobStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

@Entity('journey_template_generation_jobs')
export class JourneyTemplateGenerationJob extends BaseEntity {
  @Column('uuid')
  tenantId: string;

  @Column({
    type: 'enum',
    enum: GenerationJobStatus,
    default: GenerationJobStatus.PENDING,
  })
  status: GenerationJobStatus;

  @Column({ type: 'jsonb' })
  generationParams: {
    industry: string;
    brandName: string;
    totalDays: number;
    callsPerDay: number;
    restPeriodDays: number[];
    includeSms: boolean;
    marketingAngle: 'corporate' | 'personable' | 'psa' | 'storytelling';
    sentiment: 'kind' | 'caring' | 'concerned' | 'excited' | 'passionate' | 'enthusiastic';
    voiceTemplateId?: string;
    voicePresetId?: string;
    numberOfVoices: number;
    includeContactName: boolean;
    audioEffects?: any;
    referenceScript?: string;
    temperature?: number;
    journeyName?: string;
    smsCta?: any;
    delayConfig?: any;
  };

  @Column({ nullable: true })
  templateId: string; // Set when generation completes

  @Column({ nullable: true })
  journeyId: string; // Set when generation completes

  @Column({ type: 'text', nullable: true })
  errorMessage: string; // Set if generation fails

  @Column({ type: 'jsonb', nullable: true })
  progress: {
    currentDay?: number;
    totalDays?: number;
    currentCall?: number;
    totalCalls?: number;
    currentStep?: string;
    percentage?: number;
  };

  @Column({ nullable: true })
  startedAt: Date;

  @Column({ nullable: true })
  completedAt: Date;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @ManyToOne(() => JourneyTemplate, { nullable: true })
  @JoinColumn({ name: 'templateId' })
  template: JourneyTemplate;

  @ManyToOne(() => Journey, { nullable: true })
  @JoinColumn({ name: 'journeyId' })
  journey: Journey;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

