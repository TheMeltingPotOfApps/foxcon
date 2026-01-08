import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../common/base.entity';
import { Tenant } from './tenant.entity';

@Entity('tenant_limits')
export class TenantLimits extends BaseEntity {
  @Column('uuid')
  tenantId: string;

  // SMS Limits
  @Column({ type: 'integer', default: 0 })
  smsLimit: number; // Total SMS limit

  @Column({ type: 'integer', default: 0 })
  smsUsed: number; // SMS used count

  // Call Limits
  @Column({ type: 'integer', default: 0 })
  callLimit: number; // Total call limit

  @Column({ type: 'integer', default: 0 })
  callUsed: number; // Calls used count

  // AI Feature Limits
  @Column({ type: 'integer', default: 0 })
  aiMessageLimit: number; // AI message generation limit

  @Column({ type: 'integer', default: 0 })
  aiMessageUsed: number; // AI messages used

  @Column({ type: 'integer', default: 0 })
  aiVoiceLimit: number; // AI voice generation limit

  @Column({ type: 'integer', default: 0 })
  aiVoiceUsed: number; // AI voice used

  @Column({ type: 'integer', default: 0 })
  aiTemplateLimit: number; // AI template limit

  @Column({ type: 'integer', default: 0 })
  aiTemplateUsed: number; // AI templates used

  @Column({ type: 'integer', default: 0 })
  contentAiLimit: number; // Content AI generation limit

  @Column({ type: 'integer', default: 0 })
  contentAiUsed: number; // Content AI used

  // Plan Information
  @Column({ default: 'demo' })
  planType: string; // 'demo', 'trial', 'basic', 'pro', 'enterprise', etc.

  @Column({ type: 'timestamp', nullable: true })
  trialEndsAt: Date; // When trial expires

  @Column({ default: true })
  isActive: boolean; // Whether limits are active

  @Column({ type: 'jsonb', nullable: true })
  restrictions: {
    // Feature restrictions
    canSendSMS?: boolean;
    canMakeCalls?: boolean;
    canUseAI?: boolean;
    canUseVoiceAI?: boolean;
    canUseContentAI?: boolean;
    canCreateJourneys?: boolean;
    canCreateCampaigns?: boolean;
    canUseScheduling?: boolean;
    maxContacts?: number;
    maxSegments?: number;
    maxTemplates?: number;
    maxJourneys?: number;
    maxCampaigns?: number;
  };

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;
}

