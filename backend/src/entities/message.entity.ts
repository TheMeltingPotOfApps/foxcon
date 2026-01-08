import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../common/base.entity';
import { Conversation } from './conversation.entity';

export enum MessageDirection {
  INBOUND = 'INBOUND',
  OUTBOUND = 'OUTBOUND',
}

export enum MessageStatus {
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  READ = 'READ',
}

export enum MessageType {
  SMS = 'SMS',
  IMESSAGE = 'IMESSAGE',
}

@Entity('messages')
export class Message extends BaseEntity {
  @Column('uuid')
  conversationId: string;

  @Column({
    type: 'enum',
    enum: MessageDirection,
  })
  direction: MessageDirection;

  @Column({ type: 'text' })
  body: string;

  @Column({ nullable: true })
  twilioMessageSid: string;

  @Column({ nullable: true })
  imessageId: string; // iMessage message ID or identifier

  @Column({
    type: 'enum',
    enum: MessageStatus,
    default: MessageStatus.SENT,
  })
  status: MessageStatus;

  @Column({
    type: 'enum',
    enum: MessageType,
    default: MessageType.SMS,
  })
  messageType: MessageType;

  @Column({ nullable: true })
  sentAt: Date;

  @ManyToOne(() => Conversation, (conversation) => conversation.messages)
  @JoinColumn({ name: 'conversationId' })
  conversation: Conversation;

  @CreateDateColumn()
  createdAt: Date;
}

