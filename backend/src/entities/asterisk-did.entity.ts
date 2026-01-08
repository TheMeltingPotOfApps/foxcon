import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../common/base.entity';
import { Tenant } from './tenant.entity';

export enum DidStatus {
  ACTIVE = 'active',
  AVAILABLE = 'available',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

@Entity('asterisk_dids')
export class AsteriskDid extends BaseEntity {
  @Column('uuid')
  tenantId: string;

  @Column()
  number: string; // Phone number in E.164 format (e.g., +14045556789)

  @Column({ nullable: true })
  areaCode: string; // Area code extracted from number

  @Column({ nullable: true })
  trunk: string; // PJSIP trunk name (default: PJSIP)

  @Column({ nullable: true })
  segment: string; // Segment/group name for organizing DIDs (e.g., "twilio-main", "twilio-backup")

  @Column({
    type: 'enum',
    enum: DidStatus,
    default: DidStatus.AVAILABLE,
  })
  status: DidStatus;

  @Column({ type: 'integer', default: 0 })
  usageCount: number; // Number of times this DID has been used

  @Column({ type: 'integer', nullable: true })
  maxUsage: number | null; // Maximum usage limit (null = unlimited)

  @Column({ type: 'timestamp', nullable: true })
  lastUsed: Date | null; // Last time this DID was used

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    provider?: string; // DID provider name
    costPerMinute?: number;
    region?: string;
    notes?: string;
    importedFrom?: string; // CSV filename if imported
    importedAt?: Date;
    twilioSid?: string; // Twilio SID if imported from Twilio
    capabilities?: {
      voice?: boolean;
      sms?: boolean;
      mms?: boolean;
    }; // Phone number capabilities
    friendlyName?: string; // Friendly name from provider
  };

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;
}

