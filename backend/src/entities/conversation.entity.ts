import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../common/base.entity';
import { Contact } from './contact.entity';
import { Message } from './message.entity';

export enum ConversationStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
}

@Entity('conversations')
export class Conversation extends BaseEntity {
  @Column('uuid')
  contactId: string;

  @Column('uuid', { nullable: true })
  assignedTo: string;

  @Column({
    type: 'enum',
    enum: ConversationStatus,
    default: ConversationStatus.OPEN,
  })
  status: ConversationStatus;

  @Column({ nullable: true })
  lastMessageAt: Date;

  @ManyToOne(() => Contact)
  @JoinColumn({ name: 'contactId' })
  contact: Contact;

  @OneToMany(() => Message, (message) => message.conversation)
  messages: Message[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

