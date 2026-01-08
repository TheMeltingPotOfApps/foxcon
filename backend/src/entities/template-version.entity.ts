import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../common/base.entity';
import { Template } from './template.entity';

@Entity('template_versions')
export class TemplateVersion extends BaseEntity {
  @Column('uuid')
  templateId: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'jsonb', nullable: true })
  variables: string[];

  @Column({ default: 'draft' })
  status: string;

  @Column({ nullable: true })
  approvedAt: Date;

  @ManyToOne(() => Template, (template) => template.versions)
  @JoinColumn({ name: 'templateId' })
  template: Template;

  @CreateDateColumn()
  createdAt: Date;
}

