import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { BaseEntity } from '../common/base.entity';
import { ContactTag } from './contact-tag.entity';

// Legacy enum - kept for backward compatibility during migration
// New implementation uses tenant-specific statuses stored as strings
export enum LeadStatus {
  SOLD = 'SOLD',
  DNC = 'DNC',
  CONTACT_MADE = 'CONTACT_MADE',
  PAUSED = 'PAUSED',
  APPOINTMENT_SCHEDULED = 'APPOINTMENT_SCHEDULED',
  MARKETPLACE_DISTRIBUTED = 'MARKETPLACE_DISTRIBUTED',
}

@Entity('contacts')
export class Contact extends BaseEntity {
  @Column()
  phoneNumber: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  firstName: string;

  @Column({ nullable: true })
  lastName: string;

  @Column({ type: 'jsonb', nullable: true })
  attributes: Record<string, any>;

  @Column({ nullable: true })
  timezone: string; // Contact's timezone (e.g., 'America/New_York', 'Europe/London')

  @Column({ default: false })
  hasConsent: boolean;

  @Column({ default: false })
  isOptedOut: boolean;

  @Column({ nullable: true })
  optedOutAt: Date;

  @Column({ nullable: true })
  leadStatus: string; // Tenant-specific status name (references TenantLeadStatus.name)

  @ManyToMany(() => ContactTag, { cascade: true })
  @JoinTable({
    name: 'contact_contact_tags',
    joinColumn: { name: 'contactId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'tagId', referencedColumnName: 'id' },
  })
  tags: ContactTag[];

  // Marketplace fields (nullable for backward compatibility)
  @Column('uuid', { nullable: true })
  marketplaceListingId: string; // Which listing this lead came from

  @Column('uuid', { nullable: true })
  marketplaceSubscriptionId: string; // Which buyer subscription received it

  @Column('uuid', { nullable: true })
  marketplaceDistributionId: string; // Distribution record ID

  @Column({ type: 'jsonb', nullable: true })
  marketplaceMetadata: {
    campaignId?: string;
    adsetId?: string;
    adId?: string;
    brand?: string;
    source?: string;
    industry?: string;
    distributedAt?: Date;
    contactedAt?: Date | string;
    sold?: boolean;
  };
}

