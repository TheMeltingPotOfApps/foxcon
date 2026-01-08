import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BaseEntity } from '../common/base.entity';

@Entity('ai_configs')
export class AIConfig extends BaseEntity {
  @Column('uuid', { nullable: true })
  campaignId: string;

  @Column({ nullable: true })
  tone: string;

  @Column({ nullable: true })
  persona: string;

  @Column({ type: 'jsonb', nullable: true })
  rules: Record<string, any>;

  @Column({ default: false })
  autoSend: boolean;

  @Column({ type: 'text', nullable: true })
  businessInfo: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

