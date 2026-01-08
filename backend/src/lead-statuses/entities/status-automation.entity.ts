import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';
import { Tenant } from '../../entities/tenant.entity';
import { TenantLeadStatus } from './tenant-lead-status.entity';

export enum AutomationTriggerType {
  TIME_BASED = 'TIME_BASED', // After X days/hours/minutes
  STATUS_CHANGE = 'STATUS_CHANGE', // When status changes to X
}

export enum TimeUnit {
  MINUTES = 'MINUTES',
  HOURS = 'HOURS',
  DAYS = 'DAYS',
}

@Entity('status_automations')
@Index(['tenantId', 'isActive'])
export class StatusAutomation extends BaseEntity {
  @Column('uuid', { nullable: false })
  override tenantId: string; // Override BaseEntity's nullable tenantId to make it required

  @Column()
  name: string; // User-friendly name for the automation rule

  @Column({
    type: 'enum',
    enum: AutomationTriggerType,
    default: AutomationTriggerType.TIME_BASED,
  })
  triggerType: AutomationTriggerType;

  // For TIME_BASED triggers
  @Column({ type: 'uuid', nullable: true })
  fromStatusId: string; // Status to monitor (null = any status)

  @Column({ type: 'int', nullable: true })
  timeValue: number; // Number of time units (e.g., 2)

  @Column({
    type: 'enum',
    enum: TimeUnit,
    nullable: true,
  })
  timeUnit: TimeUnit; // Unit of time (e.g., DAYS)

  // For STATUS_CHANGE triggers
  @Column({ type: 'uuid', nullable: true })
  triggerStatusId: string; // Status that triggers the automation

  // Target status to change to
  @Column({ type: 'uuid' })
  targetStatusId: string;

  @Column({ default: true })
  isActive: boolean; // Whether this automation is active

  @Column({ type: 'jsonb', nullable: true })
  conditions: {
    // Additional conditions (e.g., only for contacts in specific campaigns)
    campaignIds?: string[];
    journeyIds?: string[];
    tags?: string[];
    [key: string]: any;
  };

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    lastProcessedAt?: Date;
    processedCount?: number;
    [key: string]: any;
  };

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @ManyToOne(() => TenantLeadStatus, { nullable: true })
  @JoinColumn({ name: 'fromStatusId' })
  fromStatus: TenantLeadStatus;

  @ManyToOne(() => TenantLeadStatus, { nullable: true })
  @JoinColumn({ name: 'triggerStatusId' })
  triggerStatus: TenantLeadStatus;

  @ManyToOne(() => TenantLeadStatus)
  @JoinColumn({ name: 'targetStatusId' })
  targetStatus: TenantLeadStatus;
}

