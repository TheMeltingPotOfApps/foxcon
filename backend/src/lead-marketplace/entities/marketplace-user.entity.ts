import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../common/base.entity';
import { User } from '../../entities/user.entity';

export enum MarketplaceUserType {
  MARKETER = 'MARKETER',
  BUYER = 'BUYER',
  BOTH = 'BOTH',
}

@Entity('marketplace_users')
export class MarketplaceUser extends BaseEntity {
  @Column('uuid')
  userId: string;

  @Column({
    type: 'enum',
    enum: MarketplaceUserType,
  })
  userType: MarketplaceUserType;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ nullable: true })
  companyName: string;

  @Column({ unique: true, nullable: true })
  storefrontSlug: string;

  @Column({ type: 'jsonb', nullable: true })
  storefrontSettings: Record<string, any>;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;
}

