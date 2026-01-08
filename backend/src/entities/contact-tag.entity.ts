import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';
import { BaseEntity } from '../common/base.entity';

@Entity('contact_tags')
export class ContactTag extends BaseEntity {
  @Column()
  name: string;

  @Column({ nullable: true })
  color: string;

  @CreateDateColumn()
  createdAt: Date;
}

