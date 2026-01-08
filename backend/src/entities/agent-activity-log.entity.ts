import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../common/base.entity';
import { User } from './user.entity';
import { AgentActivityType } from './agent-activity-type.enum';
import { AgentStatus } from './agent-status.enum';

@Entity('agent_activity_logs')
export class AgentActivityLog extends BaseEntity {
  @Column('uuid')
  agentId: string;

  @Column('uuid')
  tenantId: string;

  @Column({
    type: 'enum',
    enum: AgentActivityType,
  })
  activityType: AgentActivityType;

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    previousStatus?: AgentStatus;
    newStatus?: AgentStatus;
    callId?: string;
    duration?: number;
  };

  @ManyToOne(() => User)
  @JoinColumn({ name: 'agentId' })
  agent: User;
}

