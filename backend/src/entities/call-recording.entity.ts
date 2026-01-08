import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../common/base.entity';
import { CallSession } from './call-session.entity';

@Entity('call_recordings')
export class CallRecording extends BaseEntity {
  @Column('uuid')
  callSessionId: string;

  @Column('uuid')
  tenantId: string;

  @Column()
  filePath: string;

  @Column({ type: 'integer' })
  duration: number; // seconds

  @Column({ default: false })
  isDeleted: boolean;

  @ManyToOne(() => CallSession)
  @JoinColumn({ name: 'callSessionId' })
  callSession: CallSession;
}

