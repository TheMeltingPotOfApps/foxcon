import { Entity, Column, OneToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../common/base.entity';
import { Tenant } from './tenant.entity';

export enum AfterHoursAction {
  RESCHEDULE_NEXT_AVAILABLE = 'RESCHEDULE_NEXT_AVAILABLE',
  RESCHEDULE_NEXT_BUSINESS_DAY = 'RESCHEDULE_NEXT_BUSINESS_DAY',
  RESCHEDULE_SPECIFIC_TIME = 'RESCHEDULE_SPECIFIC_TIME',
  SKIP_NODE = 'SKIP_NODE',
  PAUSE_JOURNEY = 'PAUSE_JOURNEY',
  DEFAULT_EVENT = 'DEFAULT_EVENT',
}

export enum TcpaviolationAction {
  RESCHEDULE_NEXT_AVAILABLE = 'RESCHEDULE_NEXT_AVAILABLE',
  RESCHEDULE_NEXT_BUSINESS_DAY = 'RESCHEDULE_NEXT_BUSINESS_DAY',
  SKIP_NODE = 'SKIP_NODE',
  PAUSE_JOURNEY = 'PAUSE_JOURNEY',
  DEFAULT_EVENT = 'DEFAULT_EVENT',
  BLOCK = 'BLOCK',
}

export enum ResubmissionAction {
  SKIP_DUPLICATE = 'SKIP_DUPLICATE',
  RESCHEDULE_DELAY = 'RESCHEDULE_DELAY',
  PAUSE_JOURNEY = 'PAUSE_JOURNEY',
  DEFAULT_EVENT = 'DEFAULT_EVENT',
  CONTINUE = 'CONTINUE',
}

@Entity('execution_rules')
export class ExecutionRules extends BaseEntity {
  @Column('uuid', { unique: true })
  tenantId: string;

  // After Hours Handling
  @Column({
    type: 'varchar',
    length: 50,
    default: AfterHoursAction.RESCHEDULE_NEXT_BUSINESS_DAY,
  })
  afterHoursAction: AfterHoursAction;

  @Column({ nullable: true })
  afterHoursRescheduleTime: string; // HH:mm format for RESCHEDULE_SPECIFIC_TIME

  @Column({ nullable: true })
  afterHoursDefaultEventTypeId: string; // For DEFAULT_EVENT action

  @Column({ type: 'jsonb', nullable: true })
  afterHoursBusinessHours: {
    startHour: number; // 0-23
    endHour: number; // 0-23
    daysOfWeek: string[]; // ['MONDAY', 'TUESDAY', ...]
    timezone?: string;
  };

  // TCPA Violation Handling
  @Column({
    type: 'varchar',
    length: 50,
    default: TcpaviolationAction.BLOCK,
  })
  tcpaViolationAction: TcpaviolationAction;

  @Column({ nullable: true })
  tcpaRescheduleTime: string; // HH:mm format

  @Column({ nullable: true })
  tcpaDefaultEventTypeId: string; // For DEFAULT_EVENT action

  @Column({ type: 'integer', nullable: true })
  tcpaRescheduleDelayHours: number; // Hours to delay reschedule

  // Lead Resubmission Handling
  @Column({
    type: 'varchar',
    length: 50,
    default: ResubmissionAction.SKIP_DUPLICATE,
  })
  resubmissionAction: ResubmissionAction;

  @Column({ type: 'integer', default: 24 })
  resubmissionDetectionWindowHours: number; // Hours to look back for duplicates

  @Column({ nullable: true })
  resubmissionDefaultEventTypeId: string; // For DEFAULT_EVENT action

  @Column({ type: 'integer', nullable: true })
  resubmissionRescheduleDelayHours: number; // Hours to delay reschedule

  @Column({ default: true })
  enableAfterHoursHandling: boolean;

  @Column({ default: true })
  enableTcpaviolationHandling: boolean;

  @Column({ default: true })
  enableResubmissionHandling: boolean;

  @OneToOne(() => Tenant)
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;
}

