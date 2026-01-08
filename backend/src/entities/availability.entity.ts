import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../common/base.entity';
import { Tenant } from './tenant.entity';
import { EventType } from './event-type.entity';

export enum DayOfWeek {
  MONDAY = 'MONDAY',
  TUESDAY = 'TUESDAY',
  WEDNESDAY = 'WEDNESDAY',
  THURSDAY = 'THURSDAY',
  FRIDAY = 'FRIDAY',
  SATURDAY = 'SATURDAY',
  SUNDAY = 'SUNDAY',
}

@Entity('availabilities')
export class Availability extends BaseEntity {
  @Column({ type: 'uuid' })
  eventTypeId: string;

  @ManyToOne(() => EventType)
  @JoinColumn({ name: 'eventTypeId' })
  eventType: EventType;

  @Column({ nullable: true })
  assignedToUserId: string; // If null, applies to all users

  @Column({ type: 'jsonb' })
  weeklySchedule: {
    [key in DayOfWeek]?: {
      enabled: boolean;
      startTime: string; // HH:mm format
      endTime: string; // HH:mm format
      timezone?: string;
    };
  };

  @Column({ type: 'date', nullable: true })
  startDate: Date; // When this availability starts (null = no start date)

  @Column({ type: 'date', nullable: true })
  endDate: Date; // When this availability ends (null = no end date)

  @Column({ type: 'jsonb', nullable: true })
  blockedDates: string[]; // Array of dates in YYYY-MM-DD format that are blocked

  @Column({ nullable: true })
  maxEventsPerSlot: number; // Maximum number of events that can be scheduled in the same time slot

  @Column({ default: true })
  isActive: boolean;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;
}

