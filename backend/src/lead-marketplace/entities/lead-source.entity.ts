import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../common/base.entity';
import { Listing } from './listing.entity';

@Entity('lead_sources')
export class LeadSource extends BaseEntity {
  @Column('uuid')
  listingId: string;

  @Column()
  platform: string;

  @Column({ nullable: true })
  campaignId: string;

  @Column({ nullable: true })
  adsetId: string;

  @Column({ nullable: true })
  adId: string;

  @Column({ nullable: true })
  brand: string;

  @Column({ nullable: true })
  source: string;

  @Column({ nullable: true })
  industry: string;

  @ManyToOne(() => Listing)
  @JoinColumn({ name: 'listingId' })
  listing: Listing;
}

