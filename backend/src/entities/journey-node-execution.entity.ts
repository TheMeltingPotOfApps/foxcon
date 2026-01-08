import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../common/base.entity';
import { JourneyNode } from './journey-node.entity';
import { JourneyContact } from './journey-contact.entity';

export enum ExecutionStatus {
  PENDING = 'PENDING',
  EXECUTING = 'EXECUTING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED',
}

@Entity('journey_node_executions')
export class JourneyNodeExecution extends BaseEntity {
  @Column('uuid')
  journeyId: string;

  @Column('uuid')
  nodeId: string;

  @Column('uuid')
  journeyContactId: string;

  @Column({
    type: 'enum',
    enum: ExecutionStatus,
    default: ExecutionStatus.PENDING,
  })
  status: ExecutionStatus;

  @Column({ nullable: true })
  scheduledAt: Date;

  @Column({ nullable: true })
  executedAt: Date;

  @Column({ nullable: true })
  completedAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  result: {
    success?: boolean;
    error?: string;
    response?: any;
    nextNodeId?: string;
    action?: string;
    message?: string;
    messageSid?: string | null;
    to?: string;
    campaignId?: string;
    campaignName?: string | null;
    webhookUrl?: string;
    delayValue?: number;
    delayUnit?: string;
    // Enhanced execution logging
    ivrAudioPreviewUrl?: string; // URL to preview the IVR audio that was played
    ivrFilePath?: string; // Asterisk file path used for IVR
    didUsed?: string; // DID phone number used for the call
    didId?: string; // DID ID used
    previousAction?: string; // Previous node type/action that was executed
    previousNodeId?: string; // Previous node ID
    previousNodeName?: string; // Previous node name
    outcome?: string; // Detailed outcome (e.g., "CALL_COMPLETED", "CALL_FAILED", "SMS_SENT", "CONDITION_MET")
    outcomeDetails?: string; // Additional outcome details
    callUniqueId?: string; // Asterisk unique ID for the call
    callStatus?: string; // Call status (ANSWERED, NO_ANSWER, BUSY, FAILED, etc.)
    [key: string]: any; // Allow additional properties
  };

  @ManyToOne(() => JourneyNode, (node) => node.executions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'nodeId' })
  node: JourneyNode;

  @ManyToOne(() => JourneyContact, (journeyContact) => journeyContact.executions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'journeyContactId' })
  journeyContact: JourneyContact;
}

