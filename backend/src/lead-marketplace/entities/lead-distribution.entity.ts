import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../common/base.entity';
import { Contact } from '../../entities/contact.entity';
import { Listing } from './listing.entity';
import { MarketplaceSubscription } from './subscription.entity';

export enum DistributionStatus {
  PENDING = 'PENDING',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

@Entity('lead_distributions')
export class LeadDistribution extends BaseEntity {
  @Column('uuid')
  listingId: string;

  @Column('uuid')
  subscriptionId: string;

  @Column('uuid')
  contactId: string;

  @Column({
    type: 'enum',
    enum: DistributionStatus,
    default: DistributionStatus.PENDING,
  })
  status: DistributionStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  leadReservationsCharged: number;

  @Column({ type: 'timestamp', nullable: true })
  deliveredAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @ManyToOne(() => Listing, (listing) => listing.distributions)
  @JoinColumn({ name: 'listingId' })
  listing: Listing;

  @ManyToOne(() => MarketplaceSubscription, (subscription) => subscription.distributions)
  @JoinColumn({ name: 'subscriptionId' })
  subscription: MarketplaceSubscription;

  @ManyToOne(() => Contact)
  @JoinColumn({ name: 'contactId' })
  contact: Contact;
}

