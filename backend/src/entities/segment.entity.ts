import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { BaseEntity } from '../common/base.entity';
import { Contact } from './contact.entity';

@Entity('segments')
export class Segment extends BaseEntity {
  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'jsonb', nullable: true })
  filterCriteria: {
    tags?: string[];
    attributes?: Record<string, any>;
    hasConsent?: boolean;
  };

  @Column({ default: false })
  continuousInclusion: boolean; // If true, dynamically add contacts as they meet criteria

  @ManyToMany(() => Contact)
  @JoinTable({
    name: 'segment_contacts',
    joinColumn: { name: 'segmentId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'contactId', referencedColumnName: 'id' },
  })
  contacts: Contact[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

