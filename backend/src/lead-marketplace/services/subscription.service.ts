import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MarketplaceSubscription, SubscriptionStatus } from '../entities/subscription.entity';
import { Listing, ListingStatus } from '../entities/listing.entity';
import { LeadReservationService } from './lead-reservation.service';

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    @InjectRepository(MarketplaceSubscription)
    private subscriptionRepository: Repository<MarketplaceSubscription>,
    @InjectRepository(Listing)
    private listingRepository: Repository<Listing>,
    private leadReservationService: LeadReservationService,
  ) {}

  async create(
    tenantId: string,
    buyerId: string,
    listingId: string,
    leadCount: number,
    startDate: Date,
    endDate: Date,
    priority: number = 0,
    distributionSchedule?: Record<string, any>,
  ): Promise<MarketplaceSubscription> {
    // Validate dates
    const now = new Date();
    if (startDate >= endDate) {
      throw new BadRequestException('Start date must be before end date');
    }
    if (endDate < now) {
      throw new BadRequestException('End date cannot be in the past');
    }

    // Verify listing exists and is active
    const listing = await this.listingRepository.findOne({
      where: { id: listingId, tenantId, status: ListingStatus.ACTIVE },
    });

    if (!listing) {
      throw new NotFoundException('Active listing not found');
    }

    // Calculate total cost
    const totalCost = leadCount * Number(listing.pricePerLead);

    // Check buyer has sufficient Lead Reservations
    const balance = await this.leadReservationService.getBalance(tenantId, buyerId);
    // #region agent log
    const fs6 = require('fs'); const logPath6 = '/root/SMS/.cursor/debug.log'; const logEntry6 = JSON.stringify({location:'subscription.service.ts:50',message:'Balance check for subscription',data:{balance,totalCost,hasSufficientBalance:balance>=totalCost,leadCount,pricePerLead:Number(listing.pricePerLead),startDate:startDate.toISOString(),endDate:endDate.toISOString()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})+'\n'; fs6.appendFileSync(logPath6,logEntry6);
    // #endregion
    if (balance < totalCost) {
      throw new BadRequestException(
        `Insufficient Lead Reservations. Required: ${totalCost}, Available: ${balance}`,
      );
    }

    // Create subscription
    const subscription = this.subscriptionRepository.create({
      tenantId,
      buyerId,
      listingId,
      leadCount,
      startDate,
      endDate,
      priority,
      distributionSchedule,
      status: SubscriptionStatus.ACTIVE,
      leadsDelivered: 0,
      leadReservationsSpent: 0,
    });

    return this.subscriptionRepository.save(subscription);
  }

  async findAll(
    tenantId: string,
    buyerId?: string,
    listingId?: string,
    status?: SubscriptionStatus,
  ): Promise<MarketplaceSubscription[]> {
    const where: any = { tenantId };

    if (buyerId) {
      where.buyerId = buyerId;
    }

    if (listingId) {
      where.listingId = listingId;
    }

    if (status) {
      where.status = status;
    }

    return this.subscriptionRepository.find({
      where,
      relations: ['listing', 'listing.metrics'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(tenantId: string, subscriptionId: string): Promise<MarketplaceSubscription> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id: subscriptionId, tenantId },
      relations: ['listing', 'listing.metrics', 'distributions'],
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    return subscription;
  }

  async pause(tenantId: string, subscriptionId: string, buyerId: string): Promise<MarketplaceSubscription> {
    const subscription = await this.findOne(tenantId, subscriptionId);

    if (subscription.buyerId !== buyerId) {
      throw new BadRequestException('You do not have permission to pause this subscription');
    }

    subscription.status = SubscriptionStatus.PAUSED;
    return this.subscriptionRepository.save(subscription);
  }

  async resume(tenantId: string, subscriptionId: string, buyerId: string): Promise<MarketplaceSubscription> {
    const subscription = await this.findOne(tenantId, subscriptionId);

    if (subscription.buyerId !== buyerId) {
      throw new BadRequestException('You do not have permission to resume this subscription');
    }

    subscription.status = SubscriptionStatus.ACTIVE;
    return this.subscriptionRepository.save(subscription);
  }

  async cancel(tenantId: string, subscriptionId: string, buyerId: string): Promise<MarketplaceSubscription> {
    const subscription = await this.findOne(tenantId, subscriptionId);

    if (subscription.buyerId !== buyerId) {
      throw new BadRequestException('You do not have permission to cancel this subscription');
    }

    subscription.status = SubscriptionStatus.CANCELLED;

    // Refund unused Lead Reservations
    const listing = await this.listingRepository.findOne({
      where: { id: subscription.listingId, tenantId },
    });

    if (listing) {
      const unusedLeads = subscription.leadCount - subscription.leadsDelivered;
      const refundAmount = unusedLeads * Number(listing.pricePerLead);

      if (refundAmount > 0) {
        await this.leadReservationService.refund(tenantId, buyerId, refundAmount, {
          subscriptionId,
          reason: 'Subscription cancelled',
        });
      }
    }

    return this.subscriptionRepository.save(subscription);
  }

  async getActiveSubscriptionsForListing(
    tenantId: string,
    listingId: string,
  ): Promise<MarketplaceSubscription[]> {
    const now = new Date();
    // #region agent log
    const fs9 = require('fs'); const logPath9 = '/root/SMS/.cursor/debug.log'; const logEntry9 = JSON.stringify({location:'subscription.service.ts:165',message:'Getting active subscriptions with date validation',data:{tenantId,listingId,currentDate:now.toISOString()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})+'\n'; fs9.appendFileSync(logPath9,logEntry9);
    // #endregion
    
    const subscriptions = await this.subscriptionRepository
      .createQueryBuilder('subscription')
      .where('subscription.tenantId = :tenantId', { tenantId })
      .andWhere('subscription.listingId = :listingId', { listingId })
      .andWhere('subscription.status = :status', { status: SubscriptionStatus.ACTIVE })
      .andWhere('subscription.startDate <= :now', { now })
      .andWhere('subscription.endDate >= :now', { now })
      .orderBy('subscription.priority', 'DESC')
      .addOrderBy('subscription.createdAt', 'ASC')
      .getMany();

    // #region agent log
    const fs10 = require('fs'); const logPath10 = '/root/SMS/.cursor/debug.log'; const logEntry10 = JSON.stringify({location:'subscription.service.ts:178',message:'Active subscriptions filtered by date',data:{subscriptionsCount:subscriptions.length,listingId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})+'\n'; fs10.appendFileSync(logPath10,logEntry10);
    // #endregion

    return subscriptions;
  }
}

