import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '../common/base.entity';
import { TemplateVersion } from './template-version.entity';

export enum TemplateType {
  OUTREACH = 'OUTREACH',
  REPLY = 'REPLY',
  AI_PROMPT = 'AI_PROMPT',
  SYSTEM = 'SYSTEM',
}

@Entity('templates')
export class Template extends BaseEntity {
  @Column()
  name: string;

  @Column({
    type: 'enum',
    enum: TemplateType,
  })
  type: TemplateType;

  @Column({ nullable: true })
  category: string;

  @OneToMany(() => TemplateVersion, (version) => version.template)
  versions: TemplateVersion[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

