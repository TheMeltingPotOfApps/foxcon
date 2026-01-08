import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Tenant } from './tenant.entity';

export enum BillingUsageType {
  SMS_SENT = 'SMS_SENT',
  SMS_RECEIVED = 'SMS_RECEIVED',
  CALL_MADE = 'CALL_MADE',
  CALL_RECEIVED = 'CALL_RECEIVED',
  CALL_DURATION_SECONDS = 'CALL_DURATION_SECONDS',
  AI_MESSAGE_GENERATED = 'AI_MESSAGE_GENERATED',
  AI_VOICE_GENERATED = 'AI_VOICE_GENERATED',
  AI_TEMPLATE_CREATED = 'AI_TEMPLATE_CREATED',
  CONTENT_AI_GENERATED = 'CONTENT_AI_GENERATED',
  CAMPAIGN_LAUNCHED = 'CAMPAIGN_LAUNCHED',
  JOURNEY_LAUNCHED = 'JOURNEY_LAUNCHED',
  CONTACT_CREATED = 'CONTACT_CREATED',
  TEMPLATE_CREATED = 'TEMPLATE_CREATED',
  WEBHOOK_TRIGGERED = 'WEBHOOK_TRIGGERED',
  STORAGE_USED_MB = 'STORAGE_USED_MB',
  API_REQUEST = 'API_REQUEST',
}

@Entity('billing_usage')
@Index(['tenantId', 'createdAt'])
@Index(['tenantId', 'usageType', 'createdAt'])
@Index(['tenantId', 'billingPeriod'])
@Index(['stripeSubscriptionItemId', 'billingPeriod'])
export class BillingUsage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column({
    type: 'enum',
    enum: BillingUsageType,
  })
  usageType: BillingUsageType;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 1 })
  quantity: number; // Quantity of usage (e.g., 1 SMS, 60 seconds, etc.)

  @Column({ nullable: true })
  stripeSubscriptionItemId: string; // Stripe subscription item ID for usage-based billing

  @Column({ nullable: true })
  stripeMeterId: string; // Stripe billing meter ID

  @Column({ nullable: true })
  billingPeriod: string; // Format: YYYY-MM (e.g., '2024-01') for monthly aggregation

  @Column({ nullable: true })
  userId: string; // User who triggered the action

  @Column({ nullable: true })
  resourceId: string; // ID of the resource (message, call, campaign, etc.)

  @Column({ nullable: true })
  resourceType: string; // Type of resource (message, call, campaign, journey, etc.)

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    // Additional context
    messageSid?: string;
    callSid?: string;
    campaignId?: string;
    journeyId?: string;
    contactId?: string;
    phoneNumber?: string;
    duration?: number;
    cost?: number;
    currency?: string;
    [key: string]: any;
  };

  @Column({ default: false })
  syncedToStripe: boolean; // Whether this usage has been synced to Stripe

  @Column({ nullable: true })
  syncedAt: Date; // When it was synced to Stripe

  @Column({ nullable: true })
  stripeEventId: string; // Stripe meter event ID if synced

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @CreateDateColumn()
  createdAt: Date;
}

