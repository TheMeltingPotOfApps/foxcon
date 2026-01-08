import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { MarketplaceUser, MarketplaceUserType } from '../entities/marketplace-user.entity';
import { Listing, ListingStatus } from '../entities/listing.entity';
import { MarketplaceSubscription, SubscriptionStatus } from '../entities/subscription.entity';
import { LeadDistribution, DistributionStatus } from '../entities/lead-distribution.entity';
import { LeadReservationTransaction } from '../entities/lead-reservation-transaction.entity';
import { ListingReview } from '../entities/listing-review.entity';
import { LeadReservation } from '../entities/lead-reservation.entity';

@Injectable()
export class MarketplaceAdminAnalyticsService {
  private readonly logger = new Logger(MarketplaceAdminAnalyticsService.name);

  constructor(
    @InjectRepository(MarketplaceUser)
    private marketplaceUserRepository: Repository<MarketplaceUser>,
    @InjectRepository(Listing)
    private listingRepository: Repository<Listing>,
    @InjectRepository(MarketplaceSubscription)
    private subscriptionRepository: Repository<MarketplaceSubscription>,
    @InjectRepository(LeadDistribution)
    private distributionRepository: Repository<LeadDistribution>,
    @InjectRepository(LeadReservationTransaction)
    private transactionRepository: Repository<LeadReservationTransaction>,
    @InjectRepository(ListingReview)
    private reviewRepository: Repository<ListingReview>,
    @InjectRepository(LeadReservation)
    private leadReservationRepository: Repository<LeadReservation>,
  ) {}

  async getMarketplaceOverview(startDate?: Date, endDate?: Date) {
    try {
      const dateFilter = startDate && endDate ? Between(startDate, endDate) : undefined;

      const [
        totalMarketers,
        totalBuyers,
        totalBoth,
        verifiedMarketers,
        totalListings,
        activeListings,
        verifiedListings,
        totalSubscriptions,
        activeSubscriptions,
        totalDistributions,
        successfulDistributions,
        totalTransactions,
        totalRevenue,
        totalReviews,
        averageRating,
      ] = await Promise.all([
        this.marketplaceUserRepository.count({
          where: { userType: MarketplaceUserType.MARKETER },
        }),
        this.marketplaceUserRepository.count({
          where: { userType: MarketplaceUserType.BUYER },
        }),
        this.marketplaceUserRepository.count({
          where: { userType: MarketplaceUserType.BOTH },
        }),
        this.marketplaceUserRepository.count({
          where: { userType: MarketplaceUserType.MARKETER, isVerified: true },
        }),
        this.listingRepository.count(),
        this.listingRepository.count({
          where: { status: ListingStatus.ACTIVE },
        }),
        this.listingRepository.count({
          where: { isVerified: true },
        }),
        dateFilter
          ? this.subscriptionRepository.count({ where: { createdAt: dateFilter } })
          : this.subscriptionRepository.count(),
        this.subscriptionRepository.count({
          where: { status: SubscriptionStatus.ACTIVE },
        }),
        dateFilter
          ? this.distributionRepository.count({ where: { createdAt: dateFilter } })
          : this.distributionRepository.count(),
        dateFilter
          ? this.distributionRepository.count({
              where: { status: DistributionStatus.DELIVERED, createdAt: dateFilter },
            })
          : this.distributionRepository.count({
              where: { status: DistributionStatus.DELIVERED },
            }),
        dateFilter
          ? this.transactionRepository.count({ where: { createdAt: dateFilter } })
          : this.transactionRepository.count(),
        this.getTotalRevenue(startDate, endDate),
        this.reviewRepository.count(),
        this.getAverageRating(),
      ]);

      return {
        users: {
          totalMarketers,
          totalBuyers,
          totalBoth,
          verifiedMarketers,
          totalUsers: totalMarketers + totalBuyers + totalBoth,
        },
        listings: {
          total: totalListings,
          active: activeListings,
          verified: verifiedListings,
        },
        subscriptions: {
          total: totalSubscriptions,
          active: activeSubscriptions,
        },
        distributions: {
          total: totalDistributions,
          successful: successfulDistributions,
          successRate: totalDistributions > 0 ? (successfulDistributions / totalDistributions) * 100 : 0,
        },
        transactions: {
          total: totalTransactions,
          totalRevenue,
        },
        reviews: {
          total: totalReviews,
          averageRating,
        },
      };
    } catch (error) {
      this.logger.error(`Error getting marketplace overview: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getAllMarketplaceUsers(filters?: {
    userType?: MarketplaceUserType;
    isVerified?: boolean;
    tenantId?: string;
  }) {
    const where: any = {};

    if (filters?.userType) {
      where.userType = filters.userType;
    }

    if (filters?.isVerified !== undefined) {
      where.isVerified = filters.isVerified;
    }

    if (filters?.tenantId) {
      where.tenantId = filters.tenantId;
    }

    return this.marketplaceUserRepository.find({
      where,
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  async getAllListings(filters?: {
    status?: ListingStatus;
    isVerified?: boolean;
    tenantId?: string;
    marketerId?: string;
  }) {
    const where: any = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.isVerified !== undefined) {
      where.isVerified = filters.isVerified;
    }

    if (filters?.tenantId) {
      where.tenantId = filters.tenantId;
    }

    if (filters?.marketerId) {
      where.marketerId = filters.marketerId;
    }

    return this.listingRepository.find({
      where,
      relations: ['marketer', 'metrics'],
      order: { createdAt: 'DESC' },
    });
  }

  async getAllSubscriptions(filters?: {
    status?: SubscriptionStatus;
    tenantId?: string;
    buyerId?: string;
    listingId?: string;
  }) {
    const where: any = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.tenantId) {
      where.tenantId = filters.tenantId;
    }

    if (filters?.buyerId) {
      where.buyerId = filters.buyerId;
    }

    if (filters?.listingId) {
      where.listingId = filters.listingId;
    }

    return this.subscriptionRepository.find({
      where,
      relations: ['listing', 'listing.marketer'],
      order: { createdAt: 'DESC' },
    });
  }

  async getAllTransactions(filters?: {
    type?: string;
    tenantId?: string;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    const where: any = {};

    if (filters?.type) {
      where.type = filters.type;
    }

    if (filters?.tenantId) {
      where.tenantId = filters.tenantId;
    }

    if (filters?.userId) {
      where.userId = filters.userId;
    }

    if (filters?.startDate && filters?.endDate) {
      where.createdAt = Between(filters.startDate, filters.endDate);
    } else if (filters?.startDate) {
      where.createdAt = Between(filters.startDate, new Date());
    }

    return this.transactionRepository.find({
      where,
      relations: ['listing', 'subscription'],
      order: { createdAt: 'DESC' },
    });
  }

  async getTopMarketers(limit: number = 10) {
    const marketers = await this.marketplaceUserRepository
      .createQueryBuilder('mu')
      .where('mu.userType IN (:...types)', {
        types: [MarketplaceUserType.MARKETER, MarketplaceUserType.BOTH],
      })
      .leftJoin('listings', 'l', 'l.marketerId = mu.userId')
      .leftJoin('lead_distributions', 'ld', 'ld.listingId = l.id')
      .select('mu.id', 'id')
      .addSelect('mu.companyName', 'companyName')
      .addSelect('mu.isVerified', 'isVerified')
      .addSelect('COUNT(DISTINCT l.id)', 'totalListings')
      .addSelect('COUNT(ld.id)', 'totalLeadsDelivered')
      .groupBy('mu.id')
      .addGroupBy('mu.companyName')
      .addGroupBy('mu.isVerified')
      .orderBy('totalLeadsDelivered', 'DESC')
      .limit(limit)
      .getRawMany();

    return marketers;
  }

  async getTopListings(limit: number = 10) {
    return this.listingRepository
      .createQueryBuilder('l')
      .leftJoin('lead_distributions', 'ld', 'ld.listingId = l.id')
      .leftJoin('listing_metrics', 'lm', 'lm.listingId = l.id')
      .select('l.id', 'id')
      .addSelect('l.name', 'name')
      .addSelect('l.pricePerLead', 'pricePerLead')
      .addSelect('l.status', 'status')
      .addSelect('l.isVerified', 'isVerified')
      .addSelect('COUNT(ld.id)', 'totalDistributions')
      .addSelect('lm.contactRate', 'contactRate')
      .addSelect('lm.dncRate', 'dncRate')
      .groupBy('l.id')
      .addGroupBy('l.name')
      .addGroupBy('l.pricePerLead')
      .addGroupBy('l.status')
      .addGroupBy('l.isVerified')
      .addGroupBy('lm.contactRate')
      .addGroupBy('lm.dncRate')
      .orderBy('totalDistributions', 'DESC')
      .limit(limit)
      .getRawMany();
  }

  private async getTotalRevenue(startDate?: Date, endDate?: Date): Promise<number> {
    try {
      const queryBuilder = this.transactionRepository
        .createQueryBuilder('t')
        .select('SUM(t.amount)', 'total')
        .where('t.type = :type', { type: 'PURCHASE' });

      if (startDate && endDate) {
        queryBuilder.andWhere('t.createdAt BETWEEN :startDate AND :endDate', {
          startDate,
          endDate,
        });
      }

      const result = await queryBuilder.getRawOne();
      return result?.total ? Number(result.total) : 0;
    } catch (error) {
      this.logger.error(`Error calculating total revenue: ${error.message}`);
      return 0;
    }
  }

  private async getAverageRating(): Promise<number> {
    try {
      const result = await this.reviewRepository
        .createQueryBuilder('r')
        .select('AVG(r.rating)', 'avg')
        .getRawOne();

      return result?.avg ? Math.round(Number(result.avg) * 10) / 10 : 0;
    } catch (error) {
      this.logger.error(`Error calculating average rating: ${error.message}`);
      return 0;
    }
  }
}


