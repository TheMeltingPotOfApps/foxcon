import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../common/base.entity';
import { Tenant } from './tenant.entity';
import { User } from './user.entity';

export enum OnboardingStep {
  WELCOME = 'welcome',
  CONNECT_TWILIO = 'connect_twilio',
  ADD_CONTACTS = 'add_contacts',
  CREATE_TEMPLATE = 'create_template',
  CREATE_CAMPAIGN = 'create_campaign',
  CREATE_JOURNEY = 'create_journey',
  COMPLETE = 'complete',
}

@Entity('onboarding_progress')
export class OnboardingProgress extends BaseEntity {
  @Column('uuid')
  tenantId: string;

  @Column('uuid')
  userId: string;

  @Column({
    type: 'varchar',
    default: OnboardingStep.WELCOME,
  })
  currentStep: OnboardingStep;

  @Column({ type: 'jsonb', nullable: true })
  completedSteps: OnboardingStep[];

  @Column({ type: 'jsonb', nullable: true })
  stepData: {
    [key in OnboardingStep]?: {
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

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;
}

