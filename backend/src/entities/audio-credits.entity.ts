import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../common/base.entity';
import { Tenant } from './tenant.entity';

export enum CreditTransactionType {
  PURCHASE = 'PURCHASE',
  USAGE = 'USAGE',
  REFUND = 'REFUND',
  ADJUSTMENT = 'ADJUSTMENT',
}

@Entity('audio_credits')
export class AudioCredits extends BaseEntity {
  @Column('uuid')
  tenantId: string;

  @Column({ type: 'bigint', default: 0 })
  balance: number; // Current credit balance

  @Column({
    type: 'enum',
    enum: CreditTransactionType,
  })
  transactionType: CreditTransactionType;

  @Column({ type: 'bigint' })
  amount: number; // Positive for additions, negative for deductions

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    voiceTemplateId?: string;
    generatedAudioId?: string;
    voiceMessageId?: string;
    campaignId?: string;
    segmentId?: string;
  };

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;
}

