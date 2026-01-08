import {
  Entity,
  Column,
} from 'typeorm';

@Entity('lead_reservation_exchange_rate')
export class LeadReservationExchangeRate {
  @Column({ primary: true, type: 'uuid', default: () => 'gen_random_uuid()' })
  id: string;

  @Column({ type: 'decimal', precision: 10, scale: 4 })
  rate: number; // Lead Reservations per USD

  @Column()
  effectiveFrom: Date;

  @Column({ nullable: true })
  effectiveTo: Date;

  @Column('uuid')
  createdBy: string; // Super admin user

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}

