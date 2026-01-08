import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '../../common/base.entity';
import { User } from '../../entities/user.entity';
import { Campaign } from '../../entities/campaign.entity';
import { ListingMetrics } from './listing-metrics.entity';
import { LeadDistribution } from './lead-distribution.entity';
import { MarketplaceSubscription } from './subscription.entity';

export enum ListingStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  ARCHIVED = 'ARCHIVED',
}

@Entity('listings')
export class Listing extends BaseEntity {
  @Column('uuid')
  marketerId: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true })
  industry: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  pricePerLead: number;

  @Column({
    type: 'enum',
    enum: ListingStatus,
    default: ListingStatus.DRAFT,
  })
  status: ListingStatus;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ type: 'jsonb' })
  leadParameters: Record<string, any>; // Fields provided per lead

  @Column({ type: 'jsonb', nullable: true })
  weightDistribution: Record<string, any>; // Distribution rules

  @Column('uuid', { nullable: true })
  campaignId: string; // Links to Engine Campaign

  @Column({ nullable: true })
  adsetId: string;

  @Column({ nullable: true })
  adId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'marketerId' })
  marketer: User;

  @ManyToOne(() => Campaign, { nullable: true })
  @JoinColumn({ name: 'campaignId' })
  campaign: Campaign;

  @OneToMany(() => ListingMetrics, (metrics) => metrics.listing)
  metrics: ListingMetrics[];

  @OneToMany(() => LeadDistribution, (distribution) => distribution.listing)
  distributions: LeadDistribution[];

  @OneToMany(() => MarketplaceSubscription, (subscription) => subscription.listing)
  subscriptions: MarketplaceSubscription[];
}

