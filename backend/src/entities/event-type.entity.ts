import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../common/base.entity';
import { Tenant } from './tenant.entity';

export interface EventAction {
  type: 'ADD_TO_JOURNEY' | 'UPDATE_CONTACT_STATUS' | 'SEND_SMS' | 'CREATE_TASK';
  config: {
    journeyId?: string;
    status?: string;
    message?: string;
    taskTitle?: string;
    taskDescription?: string;
  };
}

@Entity('event_types')
export class EventType extends BaseEntity {
  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  durationMinutes: number; // Default duration for this event type

  @Column({ type: 'uuid', nullable: true })
  aiTemplateId: string; // AI messenger template that can create this event type

  @Column({ type: 'jsonb', nullable: true })
  actions: EventAction[]; // Actions to execute when event is scheduled

  @Column({ type: 'jsonb', nullable: true })
  reminderSettings: {
    enabled: boolean;
    reminders: Array<{
      minutesBefore: number; // e.g., 1440 for 24 hours before
      message?: string; // Custom reminder message
      journeyId?: string; // Journey to add contact to for reminder
    }>;
  };

  @Column({ default: true })
  isActive: boolean;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;
}

