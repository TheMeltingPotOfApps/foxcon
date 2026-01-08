import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';
import { AccountLink } from './account-link.entity';

export enum ResourceType {
  CONTACTS = 'CONTACTS',
  CAMPAIGNS = 'CAMPAIGNS',
  JOURNEYS = 'JOURNEYS',
  TEMPLATES = 'TEMPLATES',
  ALL = 'ALL',
}

export enum SharingDirection {
  ENGINE_TO_MARKETPLACE = 'ENGINE_TO_MARKETPLACE',
  MARKETPLACE_TO_ENGINE = 'MARKETPLACE_TO_ENGINE',
  BIDIRECTIONAL = 'BIDIRECTIONAL',
}

@Entity('data_sharing_permissions')
@Unique(['accountLinkId', 'resourceType'])
export class DataSharingPermission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'account_link_id' })
  accountLinkId: string;

  @Column({
    name: 'resource_type',
    type: 'enum',
    enum: ResourceType,
  })
  resourceType: ResourceType;

  @Column({ name: 'can_read', default: false })
  canRead: boolean;

  @Column({ name: 'can_write', default: false })
  canWrite: boolean;

  @Column({ name: 'can_delete', default: false })
  canDelete: boolean;

  @Column({
    name: 'sharing_direction',
    type: 'enum',
    enum: SharingDirection,
  })
  sharingDirection: SharingDirection;

  @ManyToOne(() => AccountLink, (link) => link.dataSharingPermissions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_link_id' })
  accountLink: AccountLink;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

