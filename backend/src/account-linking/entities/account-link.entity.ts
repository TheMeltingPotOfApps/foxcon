import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  OneToMany,
  Unique,
} from 'typeorm';
import { User } from '../../entities/user.entity';
import { Tenant } from '../../entities/tenant.entity';
import { MarketplaceUser } from '../../marketplace-auth/entities/marketplace-user.entity';
import { DataSharingPermission } from './data-sharing-permission.entity';

export enum LinkType {
  MANUAL = 'MANUAL',
  AUTO = 'AUTO',
  SSO = 'SSO',
}

@Entity('account_links')
@Unique(['engineUserId', 'marketplaceUserId'])
@Unique(['engineUserId', 'engineTenantId'])
export class AccountLink {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'engine_user_id' })
  engineUserId: string;

  @Column({ name: 'marketplace_user_id' })
  marketplaceUserId: string;

  @Column({ name: 'engine_tenant_id' })
  engineTenantId: string;

  @Column({
    name: 'link_type',
    type: 'enum',
    enum: LinkType,
  })
  linkType: LinkType;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'linked_at', default: () => 'CURRENT_TIMESTAMP' })
  linkedAt: Date;

  @Column({ name: 'linked_by', nullable: true })
  linkedBy: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'engine_user_id' })
  engineUser: User;

  @ManyToOne(() => MarketplaceUser, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'marketplace_user_id' })
  marketplaceUser: MarketplaceUser;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'engine_tenant_id' })
  engineTenant: Tenant;

  @OneToMany(() => DataSharingPermission, (permission) => permission.accountLink)
  dataSharingPermissions: DataSharingPermission[];
}

