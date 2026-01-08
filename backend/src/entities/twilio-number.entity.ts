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
import { NumberPool } from './number-pool.entity';

@Entity('twilio_numbers')
export class TwilioNumber {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column({ unique: true })
  phoneNumber: string;

  @Column()
  twilioSid: string;

  @Column({ type: 'jsonb', nullable: true })
  capabilities: {
    voice?: boolean;
    sms?: boolean;
    mms?: boolean;
  };

  @Column({ nullable: true })
  friendlyName: string;

  @Column({ default: 'active' })
  status: string;

  @Column('uuid', { nullable: true })
  numberPoolId: string;

  @Column({ type: 'integer', nullable: true })
  maxMessagesPerDay: number | null; // null means unlimited

  @Column({ type: 'integer', default: 0 })
  messagesSentToday: number;

  @Column({ type: 'date', nullable: true })
  lastResetDate: Date | null;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @ManyToOne(() => NumberPool, { nullable: true })
  @JoinColumn({ name: 'numberPoolId' })
  numberPool: NumberPool;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

