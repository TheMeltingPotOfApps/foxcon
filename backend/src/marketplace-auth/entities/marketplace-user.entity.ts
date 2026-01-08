import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { MarketplaceRefreshToken } from './marketplace-refresh-token.entity';
import { AccountLink } from '../../account-linking/entities/account-link.entity';

export enum MarketplaceUserType {
  MARKETER = 'MARKETER',
  BUYER = 'BUYER',
  BOTH = 'BOTH',
}

@Entity('marketplace_users')
export class MarketplaceUser {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({ name: 'first_name', nullable: true })
  firstName: string;

  @Column({ name: 'last_name', nullable: true })
  lastName: string;

  @Column({ name: 'avatar_url', nullable: true })
  avatarUrl: string;

  @Column({ name: 'email_verified', default: false })
  emailVerified: boolean;

  @Column({ name: 'email_verification_token', nullable: true })
  emailVerificationToken: string;

  @Column({ name: 'password_reset_token', nullable: true })
  passwordResetToken: string;

  @Column({ name: 'password_reset_expires', nullable: true })
  passwordResetExpires: Date;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ nullable: true })
  timezone: string;

  @Column({
    name: 'user_type',
    type: 'enum',
    enum: MarketplaceUserType,
  })
  userType: MarketplaceUserType;

  @Column({ name: 'is_verified', default: false })
  isVerified: boolean;

  @Column({ name: 'company_name', nullable: true })
  companyName: string;

  @Column({ name: 'storefront_slug', unique: true, nullable: true })
  storefrontSlug: string;

  @Column({ name: 'storefront_settings', type: 'jsonb', nullable: true })
  storefrontSettings: Record<string, any>;

  @OneToMany(() => MarketplaceRefreshToken, (token) => token.marketplaceUser)
  refreshTokens: MarketplaceRefreshToken[];

  @OneToMany(() => AccountLink, (link) => link.marketplaceUser)
  accountLinks: AccountLink[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

