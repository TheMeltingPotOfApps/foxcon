import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';
import { User } from '../../entities/user.entity';
import { MarketplaceUserType } from './marketplace-user.entity';

export enum MarketplaceOnboardingStep {
  WELCOME = 'welcome',
  CHOOSE_ROLE = 'choose_role', // Marketer, Buyer, or Both
  MARKETER_PROFILE = 'marketer_profile', // Company name, storefront setup
  MARKETER_INTEGRATION = 'marketer_integration', // Connect marketing platforms
  MARKETER_FIRST_LISTING = 'marketer_first_listing', // Create first listing
  BUYER_PROFILE = 'buyer_profile', // Buyer profile setup
  BUYER_PURCHASE_RESERVATIONS = 'buyer_purchase_reservations', // Purchase lead reservations
  BUYER_FIRST_SUBSCRIPTION = 'buyer_first_subscription', // Subscribe to first listing
  COMPLETE = 'complete',
}

@Entity('marketplace_onboarding_progress')
export class MarketplaceOnboardingProgress extends BaseEntity {
  @Column('uuid')
  userId: string;

  @Column({
    type: 'enum',
    enum: MarketplaceUserType,
    nullable: true,
  })
  selectedUserType: MarketplaceUserType;

  @Column({
    type: 'varchar',
    default: MarketplaceOnboardingStep.WELCOME,
  })
  currentStep: MarketplaceOnboardingStep;

  @Column({ type: 'jsonb', nullable: true })
  completedSteps: MarketplaceOnboardingStep[];

  @Column({ type: 'jsonb', nullable: true })
  stepData: {
    [key in MarketplaceOnboardingStep]?: {
      completed: boolean;
      completedAt?: Date;
      data?: any;
    };
  };

  @Column({ default: false })
  isCompleted: boolean;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ default: false })
  skipped: boolean;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;
}


