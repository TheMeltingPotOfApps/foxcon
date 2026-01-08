import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Listing } from './listing.entity';

@Entity('listing_metrics')
export class ListingMetrics {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column('uuid', { unique: true })
  listingId: string;

  @Column({ type: 'int', default: 0 })
  totalLeadsDelivered: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  contactRate: number; // Percentage

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  dncRate: number; // Percentage

  @Column({ type: 'int', default: 0 })
  soldCount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  averageDealValue: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  lastUpdated: Date;

  @CreateDateColumn()
  createdAt: Date; // Explicitly define to ensure column exists

  @UpdateDateColumn()
  updatedAt: Date; // Explicitly define to ensure column exists

  @ManyToOne(() => Listing, (listing) => listing.metrics)
  @JoinColumn({ name: 'listingId' })
  listing: Listing;
}

