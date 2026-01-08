import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { BaseEntity } from '../common/base.entity';
import { User } from './user.entity';
import { Tenant } from './tenant.entity';
import { AgentStatus } from './agent-status.enum';

@Entity('agent_extensions')
@Unique(['extension', 'tenantId'])
export class AgentExtension extends BaseEntity {
  @Column('uuid')
  userId: string;

  @Column('uuid')
  tenantId: string;

  @Column()
  extension: string; // e.g., "1001"

  @Column()
  sipUsername: string; // For PJSIP authentication

  @Column()
  sipPassword: string; // Encrypted

  @Column({ nullable: true })
  sipEndpoint: string; // PJSIP endpoint name

  @Column({ default: true })
  isActive: boolean;

  @Column({
    type: 'enum',
    enum: AgentStatus,
    default: AgentStatus.OFFLINE,
  })
  status: AgentStatus;

  @Column({ nullable: true })
  currentCallId: string; // Active call session ID

  @Column({ type: 'jsonb', nullable: true })
  settings: {
    ringTone?: string;
    autoAnswer?: boolean;
    wrapUpTime?: number; // seconds
    maxConcurrentCalls?: number;
  };

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;
}

