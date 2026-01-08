import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../common/base.entity';
import { Contact } from './contact.entity';

export enum ConsentType {
  EXPRESS_WRITTEN = 'EXPRESS_WRITTEN', // Explicit written consent
  IMPLIED = 'IMPLIED', // Implied consent (e.g., existing business relationship)
  VERBAL = 'VERBAL', // Verbal consent
  ELECTRONIC = 'ELECTRONIC', // Electronic consent (checkbox, form submission)
}

export enum ConsentScope {
  SMS = 'SMS',
  VOICE = 'VOICE',
  MARKETING = 'MARKETING',
  AUTOMATED = 'AUTOMATED',
  ALL = 'ALL', // All communication types
}

@Entity('contact_consents')
export class ContactConsent extends BaseEntity {
  @Column('uuid')
  contactId: string;

  @Column({
    type: 'enum',
    enum: ConsentType,
  })
  consentType: ConsentType;

  @Column({
    type: 'enum',
    enum: ConsentScope,
    default: ConsentScope.ALL,
  })
  scope: ConsentScope;

  @Column({ type: 'text', nullable: true })
  source: string; // How consent was obtained (e.g., 'WEB_FORM', 'PHONE_CALL', 'SMS_REPLY')

  @Column({ type: 'text', nullable: true })
  ipAddress: string; // IP address when consent was given

  @Column({ type: 'text', nullable: true })
  userAgent: string; // User agent when consent was given

  @Column({ type: 'text', nullable: true })
  consentText: string; // Text of the consent agreement

  @Column({ nullable: true })
  expiresAt: Date; // When consent expires (null = never expires)

  @Column({ default: true })
  isActive: boolean; // Whether consent is currently active

  @Column({ nullable: true })
  revokedAt: Date; // When consent was revoked

  @Column({ type: 'text', nullable: true })
  revocationReason: string; // Reason for revocation

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    campaignId?: string;
    journeyId?: string;
    formId?: string;
    pageUrl?: string;
    [key: string]: any;
  };

  @ManyToOne(() => Contact)
  @JoinColumn({ name: 'contactId' })
  contact: Contact;
}

