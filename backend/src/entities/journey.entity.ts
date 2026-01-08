import {
  Entity,
  Column,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '../common/base.entity';
import { JourneyNode } from './journey-node.entity';
import { JourneyContact } from './journey-contact.entity';

export enum JourneyStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  ARCHIVED = 'ARCHIVED',
}

@Entity('journeys')
export class Journey extends BaseEntity {
  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: JourneyStatus,
    default: JourneyStatus.DRAFT,
  })
  status: JourneyStatus;

  @Column({ type: 'jsonb', nullable: true })
  scheduleConfig: {
    enabled?: boolean;
    timezone?: string;
    allowedDays?: number[]; // 0-6, Sunday-Saturday
    allowedHours?: { start: number; end: number }; // 0-23
    maxMessagesPerDay?: number;
  };

  @Column({ type: 'jsonb', nullable: true })
  entryCriteria: {
    segmentIds?: string[];
    tags?: string[];
    attributes?: Record<string, any>;
  };

  @Column({ type: 'jsonb', nullable: true })
  removalCriteria: {
    enabled?: boolean;
    webhookToken?: string; // Unique token for webhook endpoint
    webhookPayloadField?: string; // Default field name for phone number in webhook payload
    conditions?: Array<{
      type: 'call_transferred' | 'call_duration' | 'webhook' | 'call_status' | 'custom';
      config?: {
        // For call_duration: minimum duration in seconds
        minDurationSeconds?: number;
        // For webhook: webhook endpoint URL or identifier
        webhookUrl?: string;
        webhookPayloadField?: string; // Field in webhook payload that contains phone number
        // For call_status: specific call statuses that trigger removal
        callStatuses?: string[];
        // For custom: custom condition evaluation
        customCondition?: Record<string, any>;
      };
    }>;
  };

  @Column({ default: false })
  autoEnrollEnabled: boolean;

  @Column({ nullable: true })
  startedAt: Date;

  @Column({ nullable: true })
  pausedAt: Date;

  @OneToMany(() => JourneyNode, (node) => node.journey, { cascade: true })
  nodes: JourneyNode[];

  @OneToMany(() => JourneyContact, (journeyContact) => journeyContact.journey)
  contacts: JourneyContact[];
}

