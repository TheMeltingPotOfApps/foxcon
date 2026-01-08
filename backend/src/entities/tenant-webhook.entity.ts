import {
  Entity,
  Column,
} from 'typeorm';
import { BaseEntity } from '../common/base.entity';

export enum WebhookEvent {
  CONTACT_CREATED = 'CONTACT_CREATED',
  CONTACT_UPDATED = 'CONTACT_UPDATED',
  CONTACT_OPTED_OUT = 'CONTACT_OPTED_OUT',
  CAMPAIGN_LAUNCHED = 'CAMPAIGN_LAUNCHED',
  CAMPAIGN_PAUSED = 'CAMPAIGN_PAUSED',
  CAMPAIGN_COMPLETED = 'CAMPAIGN_COMPLETED',
  MESSAGE_SENT = 'MESSAGE_SENT',
  MESSAGE_DELIVERED = 'MESSAGE_DELIVERED',
  MESSAGE_FAILED = 'MESSAGE_FAILED',
  CONVERSATION_CREATED = 'CONVERSATION_CREATED',
  CONVERSATION_CLOSED = 'CONVERSATION_CLOSED',
  JOURNEY_ENROLLED = 'JOURNEY_ENROLLED',
  JOURNEY_COMPLETED = 'JOURNEY_COMPLETED',
}

@Entity('tenant_webhooks')
export class TenantWebhook extends BaseEntity {
  @Column()
  url: string;

  @Column('simple-array')
  events: WebhookEvent[];

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  secret: string; // HMAC secret for signature verification

  @Column({ type: 'jsonb', nullable: true })
  headers: Record<string, string>;

  @Column({ default: 0 })
  successCount: number;

  @Column({ default: 0 })
  failureCount: number;

  @Column({ nullable: true })
  lastTriggeredAt: Date;
}

