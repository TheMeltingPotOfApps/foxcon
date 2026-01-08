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
import { NumberPool } from './number-pool.entity';

export enum CampaignType {
  OUTBOUND = 'OUTBOUND',
  CONVERSATIONAL = 'CONVERSATIONAL',
}

export enum CampaignStatus {
  DRAFT = 'DRAFT',
  SCHEDULED = 'SCHEDULED',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

@Entity('campaigns')
export class Campaign extends BaseEntity {
  @Column()
  name: string;

  @Column({
    type: 'enum',
    enum: CampaignType,
    default: CampaignType.OUTBOUND,
  })
  type: CampaignType;

  @Column({
    type: 'enum',
    enum: CampaignStatus,
    default: CampaignStatus.DRAFT,
  })
  status: CampaignStatus;

  @Column({ type: 'jsonb', nullable: true })
  speedConfig: {
    messagesPerMinute?: number;
    messagesPerHour?: number;
    messagesPerDay?: number;
  };

  @Column({ default: false })
  aiEnabled: boolean;

  @Column('uuid', { nullable: true })
  aiTemplateId: string;

  @Column('uuid', { nullable: true })
  numberPoolId: string;

  @Column({ type: 'text', nullable: true })
  messageContent: string;

  @Column('uuid', { nullable: true })
  templateId: string;

  @Column('uuid', { nullable: true })
  contentAiTemplateId: string; // For Content AI template (generates unique messages)

  @Column({ nullable: true })
  scheduledAt: Date;

  @Column({ nullable: true })
  startedAt: Date;

  @Column({ nullable: true })
  completedAt: Date;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @ManyToOne(() => NumberPool, { nullable: true })
  @JoinColumn({ name: 'numberPoolId' })
  numberPool: NumberPool;
}

