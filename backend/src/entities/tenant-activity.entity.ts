import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { BaseEntity } from '../common/base.entity';

export enum TenantActivityType {
  USER_LOGIN = 'USER_LOGIN',
  USER_LOGOUT = 'USER_LOGOUT',
  JOURNEY_CREATED = 'JOURNEY_CREATED',
  JOURNEY_UPDATED = 'JOURNEY_UPDATED',
  JOURNEY_DELETED = 'JOURNEY_DELETED',
  JOURNEY_LAUNCHED = 'JOURNEY_LAUNCHED',
  JOURNEY_PAUSED = 'JOURNEY_PAUSED',
  CAMPAIGN_CREATED = 'CAMPAIGN_CREATED',
  CAMPAIGN_UPDATED = 'CAMPAIGN_UPDATED',
  CAMPAIGN_LAUNCHED = 'CAMPAIGN_LAUNCHED',
  CAMPAIGN_PAUSED = 'CAMPAIGN_PAUSED',
  CONTACT_CREATED = 'CONTACT_CREATED',
  CONTACT_UPDATED = 'CONTACT_UPDATED',
  CONTACT_DELETED = 'CONTACT_DELETED',
  MESSAGE_SENT = 'MESSAGE_SENT',
  TEMPLATE_CREATED = 'TEMPLATE_CREATED',
  TEMPLATE_UPDATED = 'TEMPLATE_UPDATED',
  WEBHOOK_TRIGGERED = 'WEBHOOK_TRIGGERED',
  SETTINGS_UPDATED = 'SETTINGS_UPDATED',
  SUBSCRIPTION_UPDATED = 'SUBSCRIPTION_UPDATED',
  PAYMENT_PROCESSED = 'PAYMENT_PROCESSED',
}

@Entity('tenant_activities')
@Index(['tenantId', 'createdAt'])
@Index(['activityType', 'createdAt'])
@Index(['userId', 'createdAt'])
export class TenantActivity extends BaseEntity {
  @Column()
  tenantId: string;

  @Column({
    type: 'enum',
    enum: TenantActivityType,
  })
  activityType: TenantActivityType;

  @Column({ nullable: true })
  userId: string;

  @Column({ nullable: true })
  resourceId: string;

  @Column({ nullable: true })
  resourceType: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  userAgent: string;

  @CreateDateColumn()
  createdAt: Date;
}

