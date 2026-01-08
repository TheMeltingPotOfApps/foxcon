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
import { EventType } from './event-type.entity';
import { Contact } from './contact.entity';
import { Journey } from './journey.entity';

export enum CalendarEventStatus {
  SCHEDULED = 'SCHEDULED',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

export enum CalendarEventType {
  SALES_CALL = 'SALES_CALL',
  DEMO = 'DEMO',
  SUPPORT = 'SUPPORT',
  INTERNAL = 'INTERNAL',
}

@Entity('calendar_events')
export class CalendarEvent extends BaseEntity {
  @Column()
  title: string;

  @Column({ nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: CalendarEventType,
    default: CalendarEventType.SALES_CALL,
  })
  type: CalendarEventType;

  @Column({ type: 'timestamp' })
  startTime: Date;

  @Column({ type: 'timestamp' })
  endTime: Date;

  @Column({ nullable: true })
  attendeeName: string;

  @Column({ nullable: true })
  attendeeEmail: string;

  @Column({ nullable: true })
  attendeePhone: string;

  @Column({ nullable: true })
  attendeeCompany: string;

  @Column({ nullable: true })
  meetingLink: string;

  @Column({ nullable: true })
  timezone: string;

  @Column({
    type: 'enum',
    enum: CalendarEventStatus,
    default: CalendarEventStatus.SCHEDULED,
  })
  status: CalendarEventStatus;

  @Column({ nullable: true })
  assignedToUserId: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ nullable: true })
  cancelledAt: Date;

  @Column({ nullable: true })
  cancellationReason: string;

  @Column({ type: 'uuid', nullable: true })
  eventTypeId: string; // Link to EventType

  @ManyToOne(() => EventType, { nullable: true })
  @JoinColumn({ name: 'eventTypeId' })
  eventType: EventType;

  @Column({ type: 'uuid', nullable: true })
  contactId: string; // Link to Contact

  @ManyToOne(() => Contact, { nullable: true })
  @JoinColumn({ name: 'contactId' })
  contact: Contact;

  @Column({ type: 'uuid', nullable: true })
  journeyId: string; // Journey that created this event (if created from journey)

  @ManyToOne(() => Journey, { nullable: true })
  @JoinColumn({ name: 'journeyId' })
  journey: Journey;

  @Column({ type: 'jsonb', nullable: true })
  reminderSent: {
    [minutesBefore: string]: boolean; // Track which reminders have been sent
  };
}

