import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../common/base.entity';
import { User } from '../../entities/user.entity';

export enum MarketingPlatform {
  FACEBOOK = 'FACEBOOK',
  TIKTOK = 'TIKTOK',
  GOOGLE_ADS = 'GOOGLE_ADS',
  CUSTOM = 'CUSTOM',
}

@Entity('marketing_platform_integrations')
export class MarketingPlatformIntegration extends BaseEntity {
  @Column('uuid')
  marketerId: string;

  @Column({
    type: 'enum',
    enum: MarketingPlatform,
  })
  platform: MarketingPlatform;

  @Column({ nullable: true })
  platformAccountId: string;

  @Column({ type: 'text', nullable: true })
  accessToken: string; // Encrypted

  @Column({ type: 'text', nullable: true })
  refreshToken: string; // Encrypted

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastSyncedAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'marketerId' })
  marketer: User;
}

