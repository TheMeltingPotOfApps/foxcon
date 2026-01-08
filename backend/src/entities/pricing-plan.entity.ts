import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../common/base.entity';

@Entity('pricing_plans')
export class PricingPlan extends BaseEntity {
  @Column({ unique: true })
  name: string; // 'demo', 'trial', 'basic', 'pro', 'enterprise'

  @Column({ nullable: true })
  displayName: string; // Display name for UI

  @Column({ type: 'text', nullable: true })
  description: string;

  // Limits
  @Column({ type: 'integer', default: 0 })
  smsLimit: number;

  @Column({ type: 'integer', default: 0 })
  callLimit: number;

  @Column({ type: 'integer', default: 0 })
  aiMessageLimit: number;

  @Column({ type: 'integer', default: 0 })
  aiVoiceLimit: number;

  @Column({ type: 'integer', default: 0 })
  aiTemplateLimit: number;

  @Column({ type: 'integer', default: 0 })
  contentAiLimit: number;

  // Restrictions
  @Column({ type: 'jsonb', nullable: true })
  restrictions: {
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

  // Pricing
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  monthlyPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  yearlyPrice: number;

  @Column({ type: 'integer', nullable: true })
  trialDays: number; // Number of trial days

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isDefault: boolean; // Default plan for new signups

  @Column({ type: 'integer', default: 0 })
  sortOrder: number; // For display ordering
}

