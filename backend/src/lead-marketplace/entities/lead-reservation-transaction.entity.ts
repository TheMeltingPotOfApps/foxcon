import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../common/base.entity';
import { User } from '../../entities/user.entity';

export enum TransactionType {
  PURCHASE = 'PURCHASE',
  SPEND = 'SPEND',
  REFUND = 'REFUND',
  ADJUSTMENT = 'ADJUSTMENT',
}

@Entity('lead_reservation_transactions')
export class LeadReservationTransaction extends BaseEntity {
  @Column('uuid')
  userId: string;

  @Column({
    type: 'enum',
    enum: TransactionType,
  })
  type: TransactionType;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number;

  @Column('uuid', { nullable: true })
  listingId: string;

  @Column('uuid', { nullable: true })
  subscriptionId: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;
}

