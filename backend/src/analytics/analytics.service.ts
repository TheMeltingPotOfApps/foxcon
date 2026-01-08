import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { WebAnalytics, AnalyticsEventType } from '../entities/web-analytics.entity';
import { TenantActivity, TenantActivityType } from '../entities/tenant-activity.entity';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(WebAnalytics)
    private webAnalyticsRepository: Repository<WebAnalytics>,
    @InjectRepository(TenantActivity)
    private tenantActivityRepository: Repository<TenantActivity>,
  ) {}

  async trackWebEvent(data: {
    tenantId?: string;
    eventType: AnalyticsEventType;
    path?: string;
    referrer?: string;
    userAgent?: string;
    ipAddress?: string;
    country?: string;
    city?: string;
    device?: string;
    browser?: string;
    os?: string;
    metadata?: Record<string, any>;
    sessionId?: string;
    userId?: string;
  }): Promise<WebAnalytics> {
    const event = this.webAnalyticsRepository.create(data);
    return this.webAnalyticsRepository.save(event);
  }

  async trackTenantActivity(data: {
    tenantId: string;
    activityType: TenantActivityType;
    userId?: string;
    resourceId?: string;
    resourceType?: string;
    metadata?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<TenantActivity> {
    const activity = this.tenantActivityRepository.create(data);
    return this.tenantActivityRepository.save(activity);
  }

  async getWebAnalytics(filters: {
    tenantId?: string;
    startDate?: Date;
    endDate?: Date;
    eventType?: AnalyticsEventType;
    path?: string;
  }) {
    const query = this.webAnalyticsRepository.createQueryBuilder('analytics');

    if (filters.tenantId) {
      query.andWhere('analytics.tenantId = :tenantId', { tenantId: filters.tenantId });
    }

    if (filters.startDate) {
      query.andWhere('analytics.createdAt >= :startDate', { startDate: filters.startDate });
    }

    if (filters.endDate) {
      query.andWhere('analytics.createdAt <= :endDate', { endDate: filters.endDate });
    }

    if (filters.eventType) {
      query.andWhere('analytics.eventType = :eventType', { eventType: filters.eventType });
    }

    if (filters.path) {
      query.andWhere('analytics.path = :path', { path: filters.path });
    }

    query.orderBy('analytics.createdAt', 'DESC');

    return query.getMany();
  }

  async getTenantActivities(filters: {
    tenantId?: string;
    startDate?: Date;
    endDate?: Date;
    activityType?: TenantActivityType;
    userId?: string;
  }) {
    const query = this.tenantActivityRepository.createQueryBuilder('activity');

    if (filters.tenantId) {
      query.andWhere('activity.tenantId = :tenantId', { tenantId: filters.tenantId });
    }

    if (filters.startDate) {
      query.andWhere('activity.createdAt >= :startDate', { startDate: filters.startDate });
    }

    if (filters.endDate) {
      query.andWhere('activity.createdAt <= :endDate', { endDate: filters.endDate });
    }

    if (filters.activityType) {
      query.andWhere('activity.activityType = :activityType', {
        activityType: filters.activityType,
      });
    }

    if (filters.userId) {
      query.andWhere('activity.userId = :userId', { userId: filters.userId });
    }

    query.orderBy('activity.createdAt', 'DESC');

    return query.getMany();
  }

  async getDashboardStats(startDate?: Date, endDate?: Date) {
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate || new Date();

    const [
      totalPageViews,
      totalTenants,
      totalActivities,
      topPages,
      topTenants,
    ] = await Promise.all([
      this.webAnalyticsRepository.count({
        where: {
          eventType: AnalyticsEventType.PAGE_VIEW,
          createdAt: Between(start, end),
        },
      }),
      this.tenantActivityRepository
        .createQueryBuilder('activity')
        .select('COUNT(DISTINCT activity.tenantId)', 'count')
        .where('activity.createdAt >= :start', { start })
        .andWhere('activity.createdAt <= :end', { end })
        .getRawOne(),
      this.tenantActivityRepository.count({
        where: {
          createdAt: Between(start, end),
        },
      }),
      this.webAnalyticsRepository
        .createQueryBuilder('analytics')
        .select('analytics.path', 'path')
        .addSelect('COUNT(*)', 'count')
        .where('analytics.eventType = :eventType', {
          eventType: AnalyticsEventType.PAGE_VIEW,
        })
        .andWhere('analytics.createdAt >= :start', { start })
        .andWhere('analytics.createdAt <= :end', { end })
        .groupBy('analytics.path')
        .orderBy('count', 'DESC')
        .limit(10)
        .getRawMany(),
      this.tenantActivityRepository
        .createQueryBuilder('activity')
        .select('activity.tenantId', 'tenantId')
        .addSelect('COUNT(*)', 'count')
        .where('activity.createdAt >= :start', { start })
        .andWhere('activity.createdAt <= :end', { end })
        .groupBy('activity.tenantId')
        .orderBy('count', 'DESC')
        .limit(10)
        .getRawMany(),
    ]);

    return {
      totalPageViews,
      totalTenants: parseInt(totalTenants?.count || '0'),
      totalActivities,
      topPages,
      topTenants,
    };
  }
}

