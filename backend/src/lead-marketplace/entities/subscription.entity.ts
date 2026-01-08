import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '../../common/base.entity';
import { User } from '../../entities/user.entity';
import { Listing } from './listing.entity';
import { LeadDistribution } from './lead-distribution.entity';

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

@Entity('marketplace_subscriptions')
export class MarketplaceSubscription extends BaseEntity {
  @Column('uuid')
  buyerId: string;

  @Column('uuid')
  listingId: string;

  @Column({
    type: 'enum',
    enum: SubscriptionStatus,
    default: SubscriptionStatus.ACTIVE,
  })
  status: SubscriptionStatus;

  @Column({ type: 'int' })
  leadCount: number; // Total leads requested

  @Column({ type: 'int', default: 0 })
  leadsDelivered: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  leadReservationsSpent: number;

  @Column({ type: 'int', default: 0 })
  priority: number; // Higher = faster distribution

  @Column({ type: 'timestamp' })
  startDate: Date;

  @Column({ type: 'timestamp' })
  endDate: Date;

  @Column({ type: 'jsonb', nullable: true })
  distributionSchedule: Record<string, any>; // Rate limiting

  @ManyToOne(() => User)
  @JoinColumn({ name: 'buyerId' })
  buyer: User;

  @ManyToOne(() => Listing, (listing) => listing.subscriptions)
  @JoinColumn({ name: 'listingId' })
  listing: Listing;

  @OneToMany(() => LeadDistribution, (distribution) => distribution.subscription)
  distributions: LeadDistribution[];
}

