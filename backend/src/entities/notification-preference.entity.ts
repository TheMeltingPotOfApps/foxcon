import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BaseEntity } from '../common/base.entity';

export enum NotificationChannel {
  IN_APP = 'IN_APP',
  EMAIL = 'EMAIL',
  SMS = 'SMS',
}

@Entity('notification_preferences')
export class NotificationPreference extends BaseEntity {
  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'uuid', nullable: true })
  campaignId: string | null; // null = global preference

  @Column({ type: 'uuid', nullable: true })
  journeyId: string | null; // null = global preference

  @Column({ type: 'uuid', nullable: true })
  conversationId: string | null; // null = global preference

  @Column({ type: 'boolean', default: true })
  smsReplyEnabled: boolean;

  @Column({ type: 'boolean', default: false })
  campaignReplyEnabled: boolean;

  @Column({ type: 'boolean', default: false })
  journeyReplyEnabled: boolean;

  @Column({ type: 'boolean', default: false })
  conversationMessageEnabled: boolean;

  @Column({ type: 'boolean', default: false })
  campaignCompletedEnabled: boolean;

  @Column({ type: 'boolean', default: false })
  journeyCompletedEnabled: boolean;

  @Column({
    type: 'jsonb',
    default: { channels: [NotificationChannel.IN_APP] },
  })
  channels: {
    channels: NotificationChannel[];
  };
}

