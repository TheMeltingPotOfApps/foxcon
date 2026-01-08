import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { Tenant } from '../entities/tenant.entity';
import { User } from '../entities/user.entity';
import { UserTenant } from '../entities/user-tenant.entity';
import { WebAnalytics } from '../entities/web-analytics.entity';
import { TenantActivity } from '../entities/tenant-activity.entity';
import { Subscription, SubscriptionStatus } from '../entities/subscription.entity';
import { Template } from '../entities/template.entity';
import { Campaign } from '../entities/campaign.entity';
import { Journey } from '../entities/journey.entity';
import { Contact } from '../entities/contact.entity';
import { CalendarEvent } from '../entities/calendar-event.entity';
import { UserRole } from '../entities/user-role.enum';

@Injectable()
export class SuperAdminService {
  constructor(
    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserTenant)
    private userTenantRepository: Repository<UserTenant>,
    @InjectRepository(WebAnalytics)
    private webAnalyticsRepository: Repository<WebAnalytics>,
    @InjectRepository(TenantActivity)
    private tenantActivityRepository: Repository<TenantActivity>,
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
    @InjectRepository(Template)
    private templateRepository: Repository<Template>,
    @InjectRepository(Campaign)
    private campaignRepository: Repository<Campaign>,
    @InjectRepository(Journey)
    private journeyRepository: Repository<Journey>,
    @InjectRepository(Contact)
    private contactRepository: Repository<Contact>,
    @InjectRepository(CalendarEvent)
    private calendarEventRepository: Repository<CalendarEvent>,
  ) {}

  async getAllTenants() {
    return this.tenantRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async getTenantDetails(tenantId: string) {
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
    });

    if (!tenant) {
      return null;
    }

    try {
      const [
        userCount,
        subscription,
        recentActivities,
        webVisits,
        templates,
        campaigns,
        journeys,
        contacts,
      ] = await Promise.all([
        this.userRepository
          .createQueryBuilder('user')
          .innerJoin('user.userTenants', 'ut')
          .where('ut.tenantId = :tenantId', { tenantId })
          .getCount()
          .catch(() => 0),
        this.subscriptionRepository.findOne({
          where: { tenantId },
          order: { createdAt: 'DESC' },
        }).catch(() => null),
        this.tenantActivityRepository.find({
          where: { tenantId },
          order: { createdAt: 'DESC' },
          take: 50,
        }).catch(() => []),
        this.webAnalyticsRepository.count({
          where: { tenantId },
        }).catch(() => 0),
        this.templateRepository.count({
          where: { tenantId },
        }).catch(() => 0),
        this.campaignRepository.count({
          where: { tenantId },
        }).catch(() => 0),
        this.journeyRepository.count({
          where: { tenantId },
        }).catch(() => 0),
        this.contactRepository.count({
          where: { tenantId },
        }).catch(() => 0),
      ]);

      return {
        tenant,
        userCount,
        subscription,
        recentActivities,
        webVisits,
        templates,
        campaigns,
        journeys,
        contacts,
      };
    } catch (error) {
      // Fallback if any query fails
      return {
        tenant,
        userCount: 0,
        subscription: null,
        recentActivities: [],
        webVisits: 0,
        templates: 0,
        campaigns: 0,
        journeys: 0,
        contacts: 0,
      };
    }
  }

  /**
   * Get all templates for a tenant
   */
  async getTenantTemplates(tenantId: string) {
    return this.templateRepository.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });
  }

  async getSystemStats(startDate?: Date, endDate?: Date) {
    try {
      const totalTenants = await this.tenantRepository.count();
      const activeTenants = await this.tenantRepository.count({
        where: { isActive: true },
      });

      const totalUsers = await this.userRepository.count();

      let totalPageViews = 0;
      try {
        const queryBuilder = this.webAnalyticsRepository.createQueryBuilder('analytics');
        if (startDate) {
          queryBuilder.andWhere('analytics.createdAt >= :startDate', { startDate });
        }
        if (endDate) {
          queryBuilder.andWhere('analytics.createdAt <= :endDate', { endDate });
        }
        totalPageViews = await queryBuilder.getCount();
      } catch (error) {
        // Table doesn't exist, return 0
        totalPageViews = 0;
      }

      let totalActivities = 0;
      try {
        const activityQueryBuilder = this.tenantActivityRepository.createQueryBuilder('activity');
        if (startDate) {
          activityQueryBuilder.andWhere('activity.createdAt >= :startDate', { startDate });
        }
        if (endDate) {
          activityQueryBuilder.andWhere('activity.createdAt <= :endDate', { endDate });
        }
        totalActivities = await activityQueryBuilder.getCount();
      } catch (error) {
        // Table doesn't exist, return 0
        totalActivities = 0;
      }

      // Get subscription counts
      let totalSubscriptions = 0;
      let activeSubscriptions = 0;
      try {
        totalSubscriptions = await this.subscriptionRepository.count();
        activeSubscriptions = await this.subscriptionRepository.count({
          where: { status: SubscriptionStatus.ACTIVE },
        });
      } catch (error) {
        // Table doesn't exist or query fails
        totalSubscriptions = 0;
        activeSubscriptions = 0;
      }

      // Get upcoming calendar events
      let upcomingEvents = 0;
      try {
        const now = new Date();
        upcomingEvents = await this.calendarEventRepository.count({
          where: {
            startTime: MoreThanOrEqual(now),
          },
        });
      } catch (error) {
        // Table doesn't exist or query fails
        upcomingEvents = 0;
      }

      return {
        totalTenants,
        activeTenants,
        totalUsers,
        totalPageViews,
        totalActivities,
        totalSubscriptions,
        activeSubscriptions,
        upcomingEvents,
      };
    } catch (error) {
      // Fallback if main queries fail
      return {
        totalTenants: 0,
        activeTenants: 0,
        totalUsers: 0,
        totalPageViews: 0,
        totalActivities: 0,
        totalSubscriptions: 0,
        activeSubscriptions: 0,
        upcomingEvents: 0,
      };
    }
  }

  async getTrafficAnalytics(startDate?: Date, endDate?: Date) {
    try {
      const queryBuilder = this.webAnalyticsRepository.createQueryBuilder('analytics');

      if (startDate) {
        queryBuilder.andWhere('analytics.createdAt >= :startDate', { startDate });
      }
      if (endDate) {
        queryBuilder.andWhere('analytics.createdAt <= :endDate', { endDate });
      }

      const topPages = await queryBuilder
        .select('analytics.path', 'path')
        .addSelect('COUNT(*)', 'count')
        .groupBy('analytics.path')
        .orderBy('count', 'DESC')
        .limit(10)
        .getRawMany();

      const topCountriesQueryBuilder = this.webAnalyticsRepository.createQueryBuilder('analytics');
      if (startDate) {
        topCountriesQueryBuilder.andWhere('analytics.createdAt >= :startDate', { startDate });
      }
      if (endDate) {
        topCountriesQueryBuilder.andWhere('analytics.createdAt <= :endDate', { endDate });
      }

      const topCountries = await topCountriesQueryBuilder
        .select('analytics.country', 'country')
        .addSelect('COUNT(*)', 'count')
        .groupBy('analytics.country')
        .orderBy('count', 'DESC')
        .limit(10)
        .getRawMany();

      return {
        topPages,
        topCountries,
      };
    } catch (error) {
      // Table doesn't exist, return empty arrays
      return {
        topPages: [],
        topCountries: [],
      };
    }
  }

  async getAllTenantActivities(options: {
    tenantId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }) {
    try {
      const queryBuilder = this.tenantActivityRepository.createQueryBuilder('activity');

      if (options.tenantId) {
        queryBuilder.andWhere('activity.tenantId = :tenantId', { tenantId: options.tenantId });
      }
      if (options.startDate) {
        queryBuilder.andWhere('activity.createdAt >= :startDate', { startDate: options.startDate });
      }
      if (options.endDate) {
        queryBuilder.andWhere('activity.createdAt <= :endDate', { endDate: options.endDate });
      }

      queryBuilder.orderBy('activity.createdAt', 'DESC');

      if (options.limit) {
        queryBuilder.limit(options.limit);
      }

      return queryBuilder.getMany();
    } catch (error) {
      // Table doesn't exist, return empty array
      return [];
    }
  }

  /**
   * Check if a super admin already exists
   */
  async hasSuperAdmin(): Promise<boolean> {
    const count = await this.userTenantRepository.count({
      where: { role: UserRole.SUPER_ADMIN, isActive: true },
    });
    return count > 0;
  }

  /**
   * Get the current super admin user
   */
  async getSuperAdmin(): Promise<UserTenant | null> {
    return this.userTenantRepository.findOne({
      where: { role: UserRole.SUPER_ADMIN, isActive: true },
      relations: ['user', 'tenant'],
    });
  }

  /**
   * Set a user as super admin (only if no super admin exists)
   */
  async setSuperAdmin(userId: string, tenantId: string): Promise<UserTenant> {
    // Check if super admin already exists
    const existingSuperAdmin = await this.hasSuperAdmin();
    if (existingSuperAdmin) {
      throw new BadRequestException('A super admin already exists. Only one super admin account is allowed.');
    }

    // Find the user-tenant relationship
    const userTenant = await this.userTenantRepository.findOne({
      where: { userId, tenantId },
    });

    if (!userTenant) {
      throw new NotFoundException('User-tenant relationship not found');
    }

    // Update to super admin
    userTenant.role = UserRole.SUPER_ADMIN;
    return this.userTenantRepository.save(userTenant);
  }

  /**
   * Remove super admin role (only the super admin can do this)
   */
  async removeSuperAdmin(userId: string, tenantId: string): Promise<void> {
    const userTenant = await this.userTenantRepository.findOne({
      where: { userId, tenantId, role: UserRole.SUPER_ADMIN },
    });

    if (!userTenant) {
      throw new NotFoundException('Super admin not found');
    }

    // Downgrade to OWNER
    userTenant.role = UserRole.OWNER;
    await this.userTenantRepository.save(userTenant);
  }
}
