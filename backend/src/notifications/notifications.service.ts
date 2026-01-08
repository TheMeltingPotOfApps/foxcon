import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Notification, NotificationType, NotificationStatus } from '../entities/notification.entity';
import { NotificationPreference } from '../entities/notification-preference.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @InjectRepository(NotificationPreference)
    private preferenceRepository: Repository<NotificationPreference>,
  ) {}

  async createNotification(data: {
    tenantId: string;
    userId: string;
    type: NotificationType;
    title: string;
    message?: string;
    metadata?: Record<string, any>;
  }): Promise<Notification> {
    const notification = this.notificationRepository.create({
      ...data,
      status: NotificationStatus.UNREAD,
    });

    return this.notificationRepository.save(notification);
  }

  async getNotifications(
    tenantId: string,
    userId: string,
    options?: {
      status?: NotificationStatus;
      type?: NotificationType;
      limit?: number;
      offset?: number;
    },
  ): Promise<{ notifications: Notification[]; total: number }> {
    const query = this.notificationRepository
      .createQueryBuilder('notification')
      .where('notification.tenantId = :tenantId', { tenantId })
      .andWhere('notification.userId = :userId', { userId });

    if (options?.status) {
      query.andWhere('notification.status = :status', { status: options.status });
    }

    if (options?.type) {
      query.andWhere('notification.type = :type', { type: options.type });
    }

    query.orderBy('notification.createdAt', 'DESC');

    if (options?.limit) {
      query.limit(options.limit);
    }

    if (options?.offset) {
      query.offset(options.offset);
    }

    const [notifications, total] = await query.getManyAndCount();

    return { notifications, total };
  }

  async getUnreadCount(tenantId: string, userId: string): Promise<number> {
    try {
      if (!tenantId || !userId) {
        return 0;
      }
      return await this.notificationRepository.count({
        where: {
          tenantId,
          userId,
          status: NotificationStatus.UNREAD,
        },
      });
    } catch (error) {
      console.error('Error counting unread notifications:', error);
      // Return 0 if table doesn't exist or other error
      return 0;
    }
  }

  async markAsRead(tenantId: string, userId: string, notificationId: string): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, tenantId, userId },
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    notification.status = NotificationStatus.READ;
    notification.readAt = new Date();

    return this.notificationRepository.save(notification);
  }

  async markAllAsRead(tenantId: string, userId: string): Promise<void> {
    await this.notificationRepository.update(
      {
        tenantId,
        userId,
        status: NotificationStatus.UNREAD,
      },
      {
        status: NotificationStatus.READ,
        readAt: new Date(),
      },
    );
  }

  async deleteAllRead(tenantId: string, userId: string): Promise<void> {
    await this.notificationRepository.delete({
      tenantId,
      userId,
      status: NotificationStatus.READ,
    });
  }

  async archive(tenantId: string, userId: string, notificationId: string): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, tenantId, userId },
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    notification.status = NotificationStatus.ARCHIVED;
    notification.archivedAt = new Date();

    return this.notificationRepository.save(notification);
  }

  async delete(tenantId: string, userId: string, notificationId: string): Promise<void> {
    await this.notificationRepository.delete({
      id: notificationId,
      tenantId,
      userId,
    });
  }

  async getPreferences(
    tenantId: string,
    userId: string,
    options?: {
      campaignId?: string;
      journeyId?: string;
      conversationId?: string;
    },
  ): Promise<NotificationPreference | null> {
    const where: any = {
      tenantId,
      userId,
    };

    if (options?.campaignId) {
      where.campaignId = options.campaignId;
    } else if (options?.journeyId) {
      where.journeyId = options.journeyId;
    } else if (options?.conversationId) {
      where.conversationId = options.conversationId;
    } else {
      // Get global preferences (all null)
      where.campaignId = null;
      where.journeyId = null;
      where.conversationId = null;
    }

    return this.preferenceRepository.findOne({ where });
  }

  async updatePreferences(
    tenantId: string,
    userId: string,
    data: Partial<NotificationPreference>,
    options?: {
      campaignId?: string;
      journeyId?: string;
      conversationId?: string;
    },
  ): Promise<NotificationPreference> {
    const existing = await this.getPreferences(tenantId, userId, options);

    if (existing) {
      Object.assign(existing, data);
      return this.preferenceRepository.save(existing);
    } else {
      const preference = this.preferenceRepository.create({
        tenantId,
        userId,
        ...data,
        campaignId: options?.campaignId || null,
        journeyId: options?.journeyId || null,
        conversationId: options?.conversationId || null,
      });
      return this.preferenceRepository.save(preference);
    }
  }

  async shouldNotify(
    tenantId: string,
    userId: string,
    type: NotificationType,
    options?: {
      campaignId?: string;
      journeyId?: string;
      conversationId?: string;
    },
  ): Promise<boolean> {
    // Check specific preference first
    let preference = await this.getPreferences(tenantId, userId, options);

    // Fall back to global preference if no specific preference exists
    if (!preference) {
      preference = await this.getPreferences(tenantId, userId);
    }

    if (!preference) {
      // Default: enable SMS replies, disable others
      return type === NotificationType.SMS_REPLY;
    }

    switch (type) {
      case NotificationType.SMS_REPLY:
        return preference.smsReplyEnabled;
      case NotificationType.CAMPAIGN_REPLY:
        return preference.campaignReplyEnabled;
      case NotificationType.JOURNEY_REPLY:
        return preference.journeyReplyEnabled;
      case NotificationType.CONVERSATION_MESSAGE:
        return preference.conversationMessageEnabled;
      case NotificationType.CAMPAIGN_COMPLETED:
        return preference.campaignCompletedEnabled;
      case NotificationType.JOURNEY_COMPLETED:
        return preference.journeyCompletedEnabled;
      default:
        return false;
    }
  }
}

