import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../common/base.entity';
import { User } from '../../entities/user.entity';

@Entity('lead_reservations')
export class LeadReservation extends BaseEntity {
  @Column('uuid')
  userId: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  balance: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;
}

