import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../common/base.entity';
import { User } from '../../entities/user.entity';
import { Listing } from './listing.entity';

@Entity('listing_reviews')
export class ListingReview extends BaseEntity {
  @Column('uuid')
  listingId: string;

  @Column('uuid')
  buyerId: string;

  @Column({ type: 'int' })
  rating: number; // 1-5

  @Column({ type: 'text', nullable: true })
  comment: string;

  @Column({ default: false })
  isVerifiedPurchase: boolean;

  @ManyToOne(() => Listing)
  @JoinColumn({ name: 'listingId' })
  listing: Listing;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'buyerId' })
  buyer: User;
}

