import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../common/base.entity';
import { Tenant } from './tenant.entity';
import { Contact } from './contact.entity';
import { Journey } from './journey.entity';
import { JourneyNode } from './journey-node.entity';

export enum TcpaviolationType {
  NO_CONSENT = 'NO_CONSENT',
  EXPRESS_CONSENT_REQUIRED = 'EXPRESS_CONSENT_REQUIRED',
  CONSENT_EXPIRED = 'CONSENT_EXPIRED',
  OPTED_OUT = 'OPTED_OUT',
  DNC_LIST = 'DNC_LIST',
  TIME_RESTRICTION = 'TIME_RESTRICTION',
  DAY_RESTRICTION = 'DAY_RESTRICTION',
  MISSING_SENDER_ID = 'MISSING_SENDER_ID',
  AUTOMATED_WITHOUT_CONSENT = 'AUTOMATED_WITHOUT_CONSENT',
  MARKETING_WITHOUT_CONSENT = 'MARKETING_WITHOUT_CONSENT',
}

export enum TcpaviolationStatus {
  BLOCKED = 'BLOCKED', // Execution was blocked
  LOGGED = 'LOGGED', // Violation logged but execution allowed
  OVERRIDDEN = 'OVERRIDDEN', // Violation overridden by admin
  RESOLVED = 'RESOLVED', // Violation resolved (e.g., consent obtained)
}

@Entity('tcpa_violations')
export class Tcpaviolation extends BaseEntity {
  @Column('uuid')
  tenantId: string;

  @Column('uuid')
  contactId: string;

  @Column({
    type: 'enum',
    enum: TcpaviolationType,
  })
  violationType: TcpaviolationType;

  @Column({ type: 'text' })
  description: string; // Human-readable description

  @Column({
    type: 'enum',
    enum: TcpaviolationStatus,
    default: TcpaviolationStatus.BLOCKED,
  })
  status: TcpaviolationStatus;

  // Context information
  @Column('uuid', { nullable: true })
  journeyId: string; // Journey that triggered violation

  @Column('uuid', { nullable: true })
  nodeId: string; // Node that triggered violation

  @Column('uuid', { nullable: true })
  campaignId: string; // Campaign that triggered violation

  @Column({ nullable: true })
  attemptedAction: string; // e.g., 'SEND_SMS', 'MAKE_CALL'

  @Column({ type: 'jsonb', nullable: true })
  context: {
    messageContent?: string;
    phoneNumber?: string;
    timeOfAttempt?: Date;
    contactTimezone?: string;
    consentStatus?: any;
    optOutStatus?: boolean;
  };

  // Override information
  @Column('uuid', { nullable: true })
  overriddenBy: string; // User ID who overrode

  @Column({ nullable: true })
  overrideReason: string;

  @Column({ nullable: true })
  overrideNotes: string;

  @Column({ nullable: true })
  overriddenAt: Date;

  // Resolution information
  @Column({ nullable: true })
  resolvedAt: Date;

  @Column({ nullable: true })
  resolutionNotes: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @ManyToOne(() => Contact)
  @JoinColumn({ name: 'contactId' })
  contact: Contact;

  @ManyToOne(() => Journey, { nullable: true })
  @JoinColumn({ name: 'journeyId' })
  journey: Journey;

  @ManyToOne(() => JourneyNode, { nullable: true })
  @JoinColumn({ name: 'nodeId' })
  node: JourneyNode;
}

