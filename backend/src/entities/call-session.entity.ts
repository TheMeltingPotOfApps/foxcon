import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../common/base.entity';
import { CallLog } from './call-log.entity';
import { User } from './user.entity';
import { Contact } from './contact.entity';
import { CallSessionStatus } from './call-session-status.enum';
import { CallDisposition } from './call-log.entity';

@Entity('call_sessions')
export class CallSession extends BaseEntity {
  @Column('uuid')
  callLogId: string;

  @Column('uuid', { nullable: true })
  agentId: string;

  @Column('uuid', { nullable: true })
  contactId: string;

  @Column({
    type: 'enum',
    enum: CallSessionStatus,
    default: CallSessionStatus.INITIATED,
  })
  status: CallSessionStatus;

  @Column({ nullable: true })
  startedAt: Date;

  @Column({ nullable: true })
  answeredAt: Date;

  @Column({ nullable: true })
  endedAt: Date;

  @Column({ type: 'integer', nullable: true })
  duration: number; // seconds

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    channelId?: string;
    bridgeId?: string;
    recordingPath?: string;
    transferHistory?: Array<{
      from: string;
      to: string;
      timestamp: Date;
    }>;
    holdDuration?: number;
    muteDuration?: number;
  };

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({
    type: 'enum',
    enum: CallDisposition,
    nullable: true,
  })
  disposition: CallDisposition;

  @ManyToOne(() => CallLog)
  @JoinColumn({ name: 'callLogId' })
  callLog: CallLog;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'agentId' })
  agent: User;

  @ManyToOne(() => Contact, { nullable: true })
  @JoinColumn({ name: 'contactId' })
  contact: Contact;
}

