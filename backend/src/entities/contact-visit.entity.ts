import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../common/base.entity';
import { Contact } from './contact.entity';
import { EventType } from './event-type.entity';

@Entity('contact_visits')
export class ContactVisit extends BaseEntity {
  @Column({ type: 'uuid' })
  contactId: string;

  @ManyToOne(() => Contact)
  @JoinColumn({ name: 'contactId' })
  contact: Contact;

  @Column({ type: 'uuid', nullable: true })
  eventTypeId: string;

  @ManyToOne(() => EventType, { nullable: true })
  @JoinColumn({ name: 'eventTypeId' })
  eventType: EventType;

  @Column({ type: 'varchar', nullable: true })
  ipAddress: string;

  @Column({ type: 'text', nullable: true })
  userAgent: string;

  @Column({ type: 'varchar', nullable: true })
  referrer: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    source?: string;
    campaignId?: string;
    journeyId?: string;
    [key: string]: any;
  };

  @Column({ type: 'timestamp', nullable: true })
  scheduledEventAt: Date; // If they scheduled an event, when it's scheduled for
}

