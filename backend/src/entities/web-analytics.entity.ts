import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { BaseEntity } from '../common/base.entity';

export enum AnalyticsEventType {
  PAGE_VIEW = 'PAGE_VIEW',
  CLICK = 'CLICK',
  FORM_SUBMIT = 'FORM_SUBMIT',
  BUTTON_CLICK = 'BUTTON_CLICK',
  LINK_CLICK = 'LINK_CLICK',
  DOWNLOAD = 'DOWNLOAD',
  CUSTOM = 'CUSTOM',
}

@Entity('web_analytics')
@Index(['tenantId', 'createdAt'])
@Index(['eventType', 'createdAt'])
@Index(['path', 'createdAt'])
export class WebAnalytics extends BaseEntity {
  @Column({ nullable: true })
  tenantId: string;

  @Column({
    type: 'enum',
    enum: AnalyticsEventType,
    default: AnalyticsEventType.PAGE_VIEW,
  })
  eventType: AnalyticsEventType;

  @Column({ nullable: true })
  path: string;

  @Column({ nullable: true })
  referrer: string;

  @Column({ nullable: true })
  userAgent: string;

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  country: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  device: string;

  @Column({ nullable: true })
  browser: string;

  @Column({ nullable: true })
  os: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ nullable: true })
  sessionId: string;

  @Column({ nullable: true })
  userId: string;

  @CreateDateColumn()
  createdAt: Date;
}

