import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('tenants')
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ nullable: true })
  slug: string;

  @Column({ nullable: true })
  logoUrl: string;

  @Column({ nullable: true })
  timezone: string;

  @Column({ type: 'text', nullable: true })
  legalFooterTemplate: string; // Legal footer template for SMS messages (e.g., "Reply STOP to unsubscribe")

  @Column({ type: 'jsonb', nullable: true })
  branding: {
    primaryColor?: string;
    secondaryColor?: string;
    logo?: string;
  };

  @Column({ type: 'jsonb', nullable: true })
  twilioConfig: {
    accountSid?: string;
    authToken?: string; // Encrypted
    messagingServiceSid?: string;
  };

  @Column({ type: 'jsonb', nullable: true })
  aiDefaults: {
    tone?: string;
    persona?: string;
    autoSend?: boolean;
  };

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'bigint', default: 0 })
  audioCreditsBalance: number; // Current audio credits balance

  @Column({ nullable: true })
  stripeCustomerId: string; // Stripe customer ID

  @Column({ type: 'jsonb', nullable: true })
  billing: {
    planType?: string;
    subscriptionId?: string;
    trialEndsAt?: Date;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

