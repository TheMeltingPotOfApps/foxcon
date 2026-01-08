import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ListingMetrics } from '../entities/listing-metrics.entity';
import { LeadDistribution, DistributionStatus } from '../entities/lead-distribution.entity';
import { Contact, LeadStatus } from '../../entities/contact.entity';

@Injectable()
export class MarketplaceAnalyticsService {
  private readonly logger = new Logger(MarketplaceAnalyticsService.name);

  constructor(
    @InjectRepository(ListingMetrics)
    private metricsRepository: Repository<ListingMetrics>,
    @InjectRepository(LeadDistribution)
    private distributionRepository: Repository<LeadDistribution>,
    @InjectRepository(Contact)
    private contactRepository: Repository<Contact>,
  ) {}

  async updateListingMetrics(tenantId: string, listingId: string): Promise<void> {
    // Get all distributions for this listing
    const distributions = await this.distributionRepository.find({
      where: { tenantId, listingId, status: DistributionStatus.DELIVERED },
      relations: ['contact'],
    });

    const totalLeads = distributions.length;

    if (totalLeads === 0) {
      return;
    }

    // Calculate metrics
    let contactMadeCount = 0;
    let dncCount = 0;
    let soldCount = 0;

    for (const distribution of distributions) {
      const contact = distribution.contact;
      if (contact.leadStatus === LeadStatus.CONTACT_MADE) {
        contactMadeCount++;
      } else if (contact.leadStatus === LeadStatus.DNC) {
        dncCount++;
      } else if (contact.leadStatus === LeadStatus.SOLD) {
        soldCount++;
      }
    }

    const contactRate = totalLeads > 0 ? (contactMadeCount / totalLeads) * 100 : 0;
    const dncRate = totalLeads > 0 ? (dncCount / totalLeads) * 100 : 0;

    // Get or create metrics
    let metrics = await this.metricsRepository.findOne({
      where: { listingId, tenantId },
    });

    if (!metrics) {
      metrics = this.metricsRepository.create({
        tenantId,
        listingId,
      });
    }

    metrics.totalLeadsDelivered = totalLeads;
    metrics.contactRate = Number(contactRate.toFixed(2));
    metrics.dncRate = Number(dncRate.toFixed(2));
    metrics.soldCount = soldCount;
    metrics.lastUpdated = new Date();

    await this.metricsRepository.save(metrics);

    this.logger.log(`Updated metrics for listing ${listingId}: ${totalLeads} leads, ${contactRate.toFixed(2)}% contact rate`);
  }

  async getMarketerDashboard(tenantId: string, marketerId: string): Promise<any> {
    // Get all listings for this marketer
    const { Listing } = await import('../entities/listing.entity');
    const { MarketplaceSubscription } = await import('../entities/subscription.entity');
    
    const listings = await this.distributionRepository
      .createQueryBuilder('distribution')
      .leftJoin('distribution.listing', 'listing')
      .where('listing.tenantId = :tenantId', { tenantId })
      .andWhere('listing.marketerId = :marketerId', { marketerId })
      .select('listing.id', 'listingId')
      .addSelect('listing.name', 'name')
      .addSelect('COUNT(distribution.id)', 'totalLeads')
      .addSelect('SUM(distribution.leadReservationsCharged)', 'revenue')
      .groupBy('listing.id')
      .addGroupBy('listing.name')
      .orderBy('revenue', 'DESC')
      .limit(10)
      .getRawMany();

    // Get total revenue (Lead Reservations spent)
    const totalRevenue = await this.distributionRepository
      .createQueryBuilder('distribution')
      .leftJoin('distribution.listing', 'listing')
      .where('listing.tenantId = :tenantId', { tenantId })
      .andWhere('listing.marketerId = :marketerId', { marketerId })
      .andWhere('distribution.status = :status', { status: DistributionStatus.DELIVERED })
      .select('SUM(distribution.leadReservationsCharged)', 'total')
      .getRawOne();

    const totalLeadsSold = listings.reduce((sum, l) => sum + Number(l.totalLeads || 0), 0);
    const revenue = Number(totalRevenue?.total || 0);

    // Get active listings count
    const activeListings = await this.distributionRepository.manager
      .createQueryBuilder(Listing, 'listing')
      .where('listing.tenantId = :tenantId', { tenantId })
      .andWhere('listing.marketerId = :marketerId', { marketerId })
      .andWhere('listing.status = :status', { status: 'ACTIVE' })
      .getCount();

    // Get total subscriptions
    const totalSubscriptions = await this.distributionRepository.manager
      .createQueryBuilder(MarketplaceSubscription, 'subscription')
      .leftJoin('subscription.listing', 'listing')
      .where('listing.tenantId = :tenantId', { tenantId })
      .andWhere('listing.marketerId = :marketerId', { marketerId })
      .getCount();

    // Get recent activity (last 10 distributions)
    const recentDistributions = await this.distributionRepository
      .createQueryBuilder('distribution')
      .leftJoin('distribution.listing', 'listing')
      .leftJoin('distribution.subscription', 'subscription')
      .where('listing.tenantId = :tenantId', { tenantId })
      .andWhere('listing.marketerId = :marketerId', { marketerId })
      .orderBy('distribution.createdAt', 'DESC')
      .limit(10)
      .getMany();

    const recentActivity = recentDistributions.map((dist) => ({
      type: 'sale',
      message: `Lead sold from ${dist.listing?.name || 'listing'}`,
      timestamp: dist.createdAt,
    }));

    return {
      totalRevenue: revenue,
      totalLeadsSold,
      activeListings,
      averageRating: 0, // TODO: Implement rating system
      totalSubscriptions,
      revenueChange: 0, // TODO: Calculate period-over-period change
      leadsChange: 0, // TODO: Calculate period-over-period change
      topListings: listings.map((l) => ({
        id: l.listingId,
        name: l.name,
        leadsSold: Number(l.totalLeads || 0),
        revenue: Number(l.revenue || 0),
      })),
      recentActivity,
    };
  }

  async getBuyerDashboard(tenantId: string, buyerId: string): Promise<any> {
    // Get all subscriptions for this buyer
    const { MarketplaceSubscription } = await import('../entities/subscription.entity');
    
    const subscriptions = await this.distributionRepository
      .createQueryBuilder('distribution')
      .leftJoin('distribution.subscription', 'subscription')
      .where('subscription.tenantId = :tenantId', { tenantId })
      .andWhere('subscription.buyerId = :buyerId', { buyerId })
      .select('subscription.id', 'subscriptionId')
      .addSelect('COUNT(distribution.id)', 'totalLeads')
      .groupBy('subscription.id')
      .getRawMany();

    // Get total spent
    const totalSpent = await this.distributionRepository
      .createQueryBuilder('distribution')
      .leftJoin('distribution.subscription', 'subscription')
      .where('subscription.tenantId = :tenantId', { tenantId })
      .andWhere('subscription.buyerId = :buyerId', { buyerId })
      .andWhere('distribution.status = :status', { status: DistributionStatus.DELIVERED })
      .select('SUM(distribution.leadReservationsCharged)', 'total')
      .getRawOne();

    const totalLeadsReceived = subscriptions.reduce((sum, s) => sum + Number(s.totalLeads || 0), 0);
    const spent = Number(totalSpent?.total || 0);

    // Get active subscriptions count
    const activeSubscriptions = await this.distributionRepository.manager
      .createQueryBuilder(MarketplaceSubscription, 'subscription')
      .where('subscription.tenantId = :tenantId', { tenantId })
      .andWhere('subscription.buyerId = :buyerId', { buyerId })
      .andWhere('subscription.status = :status', { status: 'ACTIVE' })
      .getCount();

    // Calculate conversion rate (contacts that became SOLD)
    const soldContacts = await this.distributionRepository
      .createQueryBuilder('distribution')
      .leftJoin('distribution.contact', 'contact')
      .leftJoin('distribution.subscription', 'subscription')
      .where('subscription.tenantId = :tenantId', { tenantId })
      .andWhere('subscription.buyerId = :buyerId', { buyerId })
      .andWhere('contact.leadStatus = :status', { status: LeadStatus.SOLD })
      .getCount();

    const conversionRate = totalLeadsReceived > 0 ? (soldContacts / totalLeadsReceived) * 100 : 0;

    // Get recent leads
    const recentDistributions = await this.distributionRepository
      .createQueryBuilder('distribution')
      .leftJoin('distribution.contact', 'contact')
      .leftJoin('distribution.listing', 'listing')
      .leftJoin('distribution.subscription', 'subscription')
      .where('subscription.tenantId = :tenantId', { tenantId })
      .andWhere('subscription.buyerId = :buyerId', { buyerId })
      .select([
        'contact.firstName',
        'contact.lastName',
        'contact.phoneNumber',
        'contact.leadStatus',
        'listing.name',
        'distribution.createdAt',
      ])
      .orderBy('distribution.createdAt', 'DESC')
      .limit(20)
      .getMany();

    const recentLeads = recentDistributions.map((dist) => ({
      firstName: dist.contact?.firstName || '',
      lastName: dist.contact?.lastName || '',
      phone: dist.contact?.phoneNumber || '',
      status: dist.contact?.leadStatus || 'NEW',
      listingName: dist.listing?.name || 'Unknown',
      receivedAt: dist.createdAt,
    }));

    // Get top listings by leads received
    const topListings = await this.distributionRepository
      .createQueryBuilder('distribution')
      .leftJoin('distribution.listing', 'listing')
      .leftJoin('distribution.subscription', 'subscription')
      .where('subscription.tenantId = :tenantId', { tenantId })
      .andWhere('subscription.buyerId = :buyerId', { buyerId })
      .select('listing.id', 'listingId')
      .addSelect('listing.name', 'name')
      .addSelect('COUNT(distribution.id)', 'leadsReceived')
      .groupBy('listing.id')
      .addGroupBy('listing.name')
      .orderBy('leadsReceived', 'DESC')
      .limit(5)
      .getRawMany();

    return {
      totalSpent: spent,
      totalLeadsReceived,
      activeSubscriptions,
      averageLeadQuality: conversionRate, // Using conversion rate as quality metric
      conversionRate,
      topListings: topListings.map((l) => ({
        id: l.listingId,
        name: l.name,
        leadsReceived: Number(l.leadsReceived || 0),
      })),
      recentLeads,
    };
  }
}

