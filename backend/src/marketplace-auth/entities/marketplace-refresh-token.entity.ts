import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { MarketplaceUser } from './marketplace-user.entity';

@Entity('marketplace_refresh_tokens')
export class MarketplaceRefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'marketplace_user_id' })
  marketplaceUserId: string;

  @Column({ unique: true })
  token: string;

  @Column({ name: 'expires_at' })
  expiresAt: Date;

  @Column({ name: 'last_used_at', nullable: true })
  lastUsedAt: Date;

  @ManyToOne(() => MarketplaceUser, (user) => user.refreshTokens, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'marketplace_user_id' })
  marketplaceUser: MarketplaceUser;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

