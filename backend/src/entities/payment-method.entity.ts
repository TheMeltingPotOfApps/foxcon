import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Tenant } from './tenant.entity';

export enum PaymentMethodType {
  CARD = 'card',
  BANK_ACCOUNT = 'us_bank_account',
}

@Entity('payment_methods')
export class PaymentMethod {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column({ unique: true })
  stripePaymentMethodId: string; // Stripe payment method ID

  @Column({ nullable: true })
  stripeCustomerId: string;

  @Column({
    type: 'enum',
    enum: PaymentMethodType,
    default: PaymentMethodType.CARD,
  })
  type: PaymentMethodType;

  @Column({ default: false })
  isDefault: boolean;

  @Column({ type: 'jsonb', nullable: true })
  cardDetails: {
    brand?: string; // visa, mastercard, amex, etc.
    last4?: string;
    expMonth?: number;
    expYear?: number;
  };

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

