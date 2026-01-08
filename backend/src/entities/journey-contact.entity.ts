import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '../common/base.entity';
import { Journey } from './journey.entity';
import { Contact } from './contact.entity';
import { JourneyNodeExecution } from './journey-node-execution.entity';

export enum JourneyContactStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  REMOVED = 'REMOVED',
}

@Entity('journey_contacts')
export class JourneyContact extends BaseEntity {
  @Column('uuid')
  journeyId: string;

  @Column('uuid')
  contactId: string;

  @Column({
    type: 'enum',
    enum: JourneyContactStatus,
    default: JourneyContactStatus.ACTIVE,
  })
  status: JourneyContactStatus;

  @Column('uuid', { nullable: true })
  currentNodeId: string;

  @Column({ nullable: true })
  enrolledAt: Date;

  @Column({ nullable: true })
  completedAt: Date;

  @Column({ nullable: true })
  pausedAt: Date;

  @Column({ nullable: true })
  removedAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    enrollmentSource?: 'manual' | 'webhook' | 'segment' | 'campaign' | 'event_scheduled' | 'event_reminder';
    enrollmentData?: Record<string, any>;
  };

  @ManyToOne(() => Journey, (journey) => journey.contacts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'journeyId' })
  journey: Journey;

  @ManyToOne(() => Contact, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contactId' })
  contact: Contact;

  @OneToMany(() => JourneyNodeExecution, (execution) => execution.journeyContact)
  executions: JourneyNodeExecution[];
}

