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

export enum InvoiceStatus {
  DRAFT = 'draft',
  OPEN = 'open',
  PAID = 'paid',
  UNCOLLECTIBLE = 'uncollectible',
  VOID = 'void',
}

@Entity('invoices')
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column({ unique: true })
  stripeInvoiceId: string; // Stripe invoice ID

  @Column({ nullable: true })
  stripeCustomerId: string;

  @Column({
    type: 'enum',
    enum: InvoiceStatus,
    default: InvoiceStatus.DRAFT,
  })
  status: InvoiceStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  amountPaid: number;

  @Column({ nullable: true })
  currency: string;

  @Column({ nullable: true })
  invoicePdf: string; // URL to PDF

  @Column({ nullable: true })
  hostedInvoiceUrl: string; // Stripe hosted invoice URL

  @Column({ nullable: true })
  dueDate: Date;

  @Column({ nullable: true })
  paidAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  lineItems: Array<{
    description: string;
    amount: number;
    quantity?: number;
  }>;

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

