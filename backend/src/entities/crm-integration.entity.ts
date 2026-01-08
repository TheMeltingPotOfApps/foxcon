import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Tenant } from './tenant.entity';
import { User } from './user.entity';
import { MarketplaceUser } from '../marketplace-auth/entities/marketplace-user.entity';

export enum CrmProvider {
  HUBSPOT = 'HUBSPOT',
  SALESFORCE = 'SALESFORCE',
  PIPEDRIVE = 'PIPEDRIVE',
  ZOHO = 'ZOHO',
  ACTIVE_CAMPAIGN = 'ACTIVE_CAMPAIGN',
  MAILCHIMP = 'MAILCHIMP',
  CUSTOM = 'CUSTOM',
}

export enum CrmIntegrationType {
  ENGINE = 'ENGINE',
  MARKETPLACE = 'MARKETPLACE',
}

export enum SyncDirection {
  ENGINE_TO_CRM = 'ENGINE_TO_CRM',
  CRM_TO_ENGINE = 'CRM_TO_ENGINE',
  BIDIRECTIONAL = 'BIDIRECTIONAL',
}

@Entity('crm_integrations')
@Index(['tenantId', 'provider'])
@Index(['marketplaceUserId', 'provider'])
export class CrmIntegration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // For Engine integrations
  @Column({ name: 'tenant_id', nullable: true })
  tenantId: string;

  @Column({ name: 'user_id', nullable: true })
  userId: string;

  // For Marketplace integrations
  @Column({ name: 'marketplace_user_id', nullable: true })
  marketplaceUserId: string;

  @Column({
    type: 'enum',
    enum: CrmIntegrationType,
  })
  type: CrmIntegrationType;

  @Column({
    type: 'enum',
    enum: CrmProvider,
  })
  provider: CrmProvider;

  @Column({ nullable: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  apiKey: string; // Encrypted

  @Column({ type: 'text', nullable: true })
  accessToken: string; // Encrypted

  @Column({ type: 'text', nullable: true })
  refreshToken: string; // Encrypted

  @Column({ nullable: true })
  apiUrl: string;

  @Column({ nullable: true })
  accountId: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({
    type: 'enum',
    enum: SyncDirection,
    default: SyncDirection.BIDIRECTIONAL,
  })
  syncDirection: SyncDirection;

  // Field mappings
  @Column({ type: 'jsonb', nullable: true })
  fieldMappings: {
    contact: {
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      company?: string;
      [key: string]: string | undefined;
    };
    custom?: Record<string, string>;
  };

  // Sync settings
  @Column({ type: 'jsonb', nullable: true })
  syncSettings: {
    syncContacts: boolean;
    syncLeads: boolean;
    syncDeals: boolean;
    autoSync: boolean;
    syncInterval?: number; // minutes
    lastSyncAt?: Date;
  };

  // OAuth settings
  @Column({ type: 'jsonb', nullable: true })
  oauthConfig: {
    clientId?: string;
    clientSecret?: string; // Encrypted
    redirectUri?: string;
    scope?: string[];
    expiresAt?: Date;
  };

  // Linked account sync
  @Column({ name: 'sync_to_linked_account', default: false })
  syncToLinkedAccount: boolean;

  @Column({ name: 'linked_account_synced_at', nullable: true })
  linkedAccountSyncedAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @ManyToOne(() => Tenant, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @ManyToOne(() => User, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => MarketplaceUser, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'marketplace_user_id' })
  marketplaceUser: MarketplaceUser;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

