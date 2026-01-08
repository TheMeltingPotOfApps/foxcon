import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { BaseEntity } from '../common/base.entity';
import { Tenant } from './tenant.entity';

@Entity('call_queues')
@Unique(['name', 'tenantId'])
export class CallQueue extends BaseEntity {
  @Column('uuid')
  tenantId: string;

  @Column()
  name: string; // e.g., "Sales", "Support"

  @Column()
  queueNumber: string; // Asterisk queue number

  @Column({ type: 'text', array: true, default: [] })
  agentIds: string[]; // User IDs assigned to queue

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'jsonb', nullable: true })
  settings: {
    ringStrategy?: 'ringall' | 'leastrecent' | 'fewestcalls' | 'random';
    timeout?: number;
    maxWaitTime?: number;
    holdMusic?: string;
  };

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;
}

