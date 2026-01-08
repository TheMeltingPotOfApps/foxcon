import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BaseEntity } from '../common/base.entity';

export enum NotificationType {
  SMS_REPLY = 'SMS_REPLY',
  CAMPAIGN_REPLY = 'CAMPAIGN_REPLY',
  JOURNEY_REPLY = 'JOURNEY_REPLY',
  CONVERSATION_MESSAGE = 'CONVERSATION_MESSAGE',
  CAMPAIGN_COMPLETED = 'CAMPAIGN_COMPLETED',
  JOURNEY_COMPLETED = 'JOURNEY_COMPLETED',
}

export enum NotificationStatus {
  UNREAD = 'UNREAD',
  READ = 'READ',
  ARCHIVED = 'ARCHIVED',
}

@Entity('notifications')
export class Notification extends BaseEntity {
  @Column({ type: 'uuid' })
  userId: string; // User who should receive the notification

  @Column({
    type: 'enum',
    enum: NotificationType,
  })
  type: NotificationType;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  message: string;

  @Column({
    type: 'enum',
    enum: NotificationStatus,
    default: NotificationStatus.UNREAD,
  })
  status: NotificationStatus;

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    campaignId?: string;
    journeyId?: string;
    contactId?: string;
    conversationId?: string;
    messageId?: string;
    [key: string]: any;
  };

  @Column({ type: 'timestamp', nullable: true })
  readAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  archivedAt: Date;
}

