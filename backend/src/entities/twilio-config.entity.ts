import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Tenant } from './tenant.entity';

@Entity('twilio_configs')
export class TwilioConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { unique: true })
  tenantId: string;

  @Column()
  accountSid: string;

  @Column()
  authToken: string; // Encrypted

  @Column({ nullable: true })
  messagingServiceSid: string;

  @Column({ default: true })
  isActive: boolean;

  @OneToOne(() => Tenant)
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

