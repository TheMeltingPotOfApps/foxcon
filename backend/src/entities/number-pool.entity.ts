import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Tenant } from './tenant.entity';
import { TwilioNumber } from './twilio-number.entity';

@Entity('number_pools')
export class NumberPool {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'integer', nullable: true })
  maxMessagesPerDay: number | null; // null means unlimited, applies to all numbers in pool

  @Column({ type: 'integer', default: 0 })
  totalMessagesSentToday: number;

  @Column({ type: 'date', nullable: true })
  lastResetDate: Date | null;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @OneToMany(() => TwilioNumber, (number) => number.numberPool)
  numbers: TwilioNumber[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

