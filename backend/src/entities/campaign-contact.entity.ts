import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../common/base.entity';
import { Campaign } from './campaign.entity';
import { Contact } from './contact.entity';

export enum CampaignContactStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  BOUNCED = 'BOUNCED',
}

@Entity('campaign_contacts')
export class CampaignContact extends BaseEntity {
  @Column('uuid')
  campaignId: string;

  @Column('uuid')
  contactId: string;

  @Column({
    type: 'enum',
    enum: CampaignContactStatus,
    default: CampaignContactStatus.PENDING,
  })
  status: CampaignContactStatus;

  @Column({ nullable: true })
  sentAt: Date;

  @Column({ nullable: true })
  deliveredAt: Date;

  @Column({ nullable: true })
  twilioMessageSid: string;

  @Column({ nullable: true })
  errorMessage: string;

  @ManyToOne(() => Campaign)
  @JoinColumn({ name: 'campaignId' })
  campaign: Campaign;

  @ManyToOne(() => Contact)
  @JoinColumn({ name: 'contactId' })
  contact: Contact;
}

