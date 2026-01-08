import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../common/base.entity';
import { Tenant } from './tenant.entity';

export enum CallStatus {
  INITIATED = 'initiated',
  CONNECTED = 'connected',
  ANSWERED = 'answered',
  FAILED = 'failed',
  COMPLETED = 'completed',
  NO_ANSWER = 'no_answer',
}

export enum CallDisposition {
  ANSWERED = 'ANSWERED',
  NO_ANSWER = 'NO_ANSWER',
  BUSY = 'BUSY',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

@Entity('call_logs')
export class CallLog extends BaseEntity {
  @Column('uuid')
  tenantId: string;

  @Column()
  from: string; // Caller ID (DID number)

  @Column()
  to: string; // Destination number

  @Column({ nullable: true })
  transferNumber: string; // Transfer destination number

  @Column({ nullable: true })
  trunk: string; // PJSIP trunk name

  @Column({ nullable: true, default: 'DynamicIVR' })
  context: string; // Dialplan context

  @Column({ nullable: true })
  uniqueId: string; // Asterisk unique ID

  @Column({ nullable: true })
  destinationNumber: string; // Alias for 'to'

  @Column({ nullable: true })
  callerId: string; // Alias for 'from'

  @Column({ nullable: true })
  phoneNumber: string; // Alias for 'to'

  @Column({ nullable: true })
  didUsed: string; // DID number used

  @Column({
    type: 'enum',
    enum: CallStatus,
    default: CallStatus.INITIATED,
  })
  status: CallStatus;

  @Column({
    type: 'enum',
    enum: CallStatus,
    default: CallStatus.INITIATED,
  })
  callStatus: CallStatus; // Alias for status

  @Column({
    type: 'enum',
    enum: CallDisposition,
    nullable: true,
  })
  disposition: CallDisposition;

  @Column({ type: 'integer', nullable: true })
  duration: number; // Call duration in seconds

  @Column({ type: 'integer', nullable: true })
  billableSeconds: number; // Billable duration

  @Column({ type: 'jsonb', nullable: true })
  callFlowEvents: Array<{
    type: string;
    timestamp: Date;
    data: any;
  }>; // Array of call flow events

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    ivrFile?: string;
    voicemailFile?: string;
    waitStrategy?: string;
    pressKey?: string;
    amdEnabled?: boolean;
    transferPrefix?: string;
    customCallId?: string;
    channel?: string;
    answerTime?: Date;
    bridgeTime?: Date;
    transferStatus?: string;
    transferBillableSeconds?: number;
  };

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;
}

