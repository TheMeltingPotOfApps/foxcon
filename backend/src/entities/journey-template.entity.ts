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
import { Journey, JourneyStatus } from './journey.entity';
import { JourneyNode } from './journey-node.entity';

export enum TemplateCategory {
  LEAD_NURTURE = 'LEAD_NURTURE',
  ONBOARDING = 'ONBOARDING',
  RETENTION = 'RETENTION',
  SALES = 'SALES',
  SUPPORT = 'SUPPORT',
  CUSTOM = 'CUSTOM',
}

@Entity('journey_templates')
export class JourneyTemplate extends BaseEntity {
  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: TemplateCategory,
    default: TemplateCategory.CUSTOM,
  })
  category: TemplateCategory;

  @Column({ default: false })
  isPublic: boolean; // Public templates available to all tenants

  @Column({ nullable: true })
  createdByUserId: string;

  @Column({ type: 'jsonb' })
  journeyData: {
    name: string;
    description?: string;
    entryCriteria?: any;
    autoEnrollEnabled?: boolean;
    scheduleConfig?: any;
    nodes: Array<{
      id: string;
      type: string;
      positionX: number;
      positionY: number;
      config: any;
      connections?: any;
    }>;
  };

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    estimatedDuration?: string;
    useCase?: string;
    tags?: string[];
    previewImage?: string;
  };

  @Column({ default: 0 })
  usageCount: number; // Track how many times this template has been used

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

