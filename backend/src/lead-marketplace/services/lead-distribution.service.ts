import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LeadDistribution, DistributionStatus } from '../entities/lead-distribution.entity';
import { Listing } from '../entities/listing.entity';
import { MarketplaceSubscription } from '../entities/subscription.entity';
import { Contact } from '../../entities/contact.entity';
import { SubscriptionService } from './subscription.service';
import { LeadReservationService } from './lead-reservation.service';
import { RabbitMQDistributionService } from './rabbitmq-distribution.service';
import { MarketplaceAnalyticsService } from './marketplace-analytics.service';
import { Inject, forwardRef } from '@nestjs/common';

@Injectable()
export class LeadDistributionService {
  private readonly logger = new Logger(LeadDistributionService.name);

  constructor(
    @InjectRepository(LeadDistribution)
    private distributionRepository: Repository<LeadDistribution>,
    @InjectRepository(Listing)
    private listingRepository: Repository<Listing>,
    @InjectRepository(MarketplaceSubscription)
    private subscriptionRepository: Repository<MarketplaceSubscription>,
    @InjectRepository(Contact)
    private contactRepository: Repository<Contact>,
    private subscriptionService: SubscriptionService,
    private leadReservationService: LeadReservationService,
    @Inject(forwardRef(() => RabbitMQDistributionService))
    private rabbitMQService: RabbitMQDistributionService,
    private analyticsService: MarketplaceAnalyticsService,
  ) {}

  async distributeLead(
    tenantId: string,
    listingId: string,
    contactData: any,
    metadata: {
      campaignId?: string;
      adsetId?: string;
      adId?: string;
      brand?: string;
      source?: string;
      industry?: string;
    },
  ): Promise<LeadDistribution> {
    // Get listing
    const listing = await this.listingRepository.findOne({
      where: { id: listingId, tenantId },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    if (listing.status !== 'ACTIVE') {
      throw new BadRequestException('Listing is not active');
    }

    // Get active subscriptions for this listing
    const subscriptions = await this.subscriptionService.getActiveSubscriptionsForListing(
      tenantId,
      listingId,
    );

    // #region agent log
    const fs7 = require('fs'); const logPath7 = '/root/SMS/.cursor/debug.log'; const logEntry7 = JSON.stringify({location:'lead-distribution.service.ts:65',message:'Active subscriptions check',data:{subscriptionsCount:subscriptions.length,listingId,tenantId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})+'\n'; fs7.appendFileSync(logPath7,logEntry7);
    // #endregion

    if (subscriptions.length === 0) {
      throw new BadRequestException('No active subscriptions found for this listing');
    }

    // Apply weight distribution algorithm
    const selectedSubscription = this.applyWeightDistribution(subscriptions, listing);

    // Check buyer has sufficient Lead Reservations
    const balance = await this.leadReservationService.getBalance(tenantId, selectedSubscription.buyerId);
    const pricePerLead = Number(listing.pricePerLead);

    // #region agent log
    const fs8 = require('fs'); const logPath8 = '/root/SMS/.cursor/debug.log'; const logEntry8 = JSON.stringify({location:'lead-distribution.service.ts:77',message:'Balance check before distribution',data:{balance,pricePerLead,hasSufficientBalance:balance>=pricePerLead,buyerId:selectedSubscription.buyerId,subscriptionId:selectedSubscription.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})+'\n'; fs8.appendFileSync(logPath8,logEntry8);
    // #endregion

    if (balance < pricePerLead) {
      this.logger.warn(
        `Buyer ${selectedSubscription.buyerId} has insufficient balance. Skipping distribution.`,
      );
      throw new BadRequestException('Buyer has insufficient Lead Reservations');
    }

    // Check subscription limits
    if (selectedSubscription.leadsDelivered >= selectedSubscription.leadCount) {
      throw new BadRequestException('Subscription has reached its lead limit');
    }

    // Create or find contact in Engine
    let contact: Contact;
    if (contactData.phoneNumber) {
      contact = await this.contactRepository.findOne({
        where: {
          phoneNumber: contactData.phoneNumber,
          tenantId,
        },
      });

      if (!contact) {
        // Create new contact directly via repository
        contact = this.contactRepository.create({
          tenantId,
          phoneNumber: contactData.phoneNumber,
          email: contactData.email || null,
          firstName: contactData.firstName || null,
          lastName: contactData.lastName || null,
          attributes: contactData.attributes || null,
          hasConsent: true,
          isOptedOut: false,
          marketplaceListingId: listingId,
          marketplaceSubscriptionId: selectedSubscription.id,
          marketplaceMetadata: {
            ...metadata,
            distributedAt: new Date(),
          },
        });
        contact = await this.contactRepository.save(contact);
      } else {
        // Update existing contact with marketplace info
        contact.marketplaceListingId = listingId;
        contact.marketplaceSubscriptionId = selectedSubscription.id;
        contact.marketplaceMetadata = {
          ...(contact.marketplaceMetadata || {}),
          ...metadata,
          distributedAt: new Date(),
        };
        contact = await this.contactRepository.save(contact);
      }
    } else {
      throw new BadRequestException('Phone number is required');
    }

    // Create distribution record
    const distribution = this.distributionRepository.create({
      tenantId,
      listingId,
      subscriptionId: selectedSubscription.id,
      contactId: contact.id,
      status: DistributionStatus.PENDING,
      leadReservationsCharged: pricePerLead,
      metadata,
    });

    await this.distributionRepository.save(distribution);

    // Update contact with distribution ID
    contact.marketplaceDistributionId = distribution.id;
    await this.contactRepository.save(contact);

    // Charge Lead Reservations
    await this.leadReservationService.spend(tenantId, selectedSubscription.buyerId, pricePerLead, {
      listingId,
      subscriptionId: selectedSubscription.id,
      distributionId: distribution.id,
    });

    // Update subscription counters
    selectedSubscription.leadsDelivered += 1;
    selectedSubscription.leadReservationsSpent = Number(selectedSubscription.leadReservationsSpent) + pricePerLead;
    await this.subscriptionRepository.save(selectedSubscription);

    // Mark distribution as delivered
    distribution.status = DistributionStatus.DELIVERED;
    distribution.deliveredAt = new Date();
    await this.distributionRepository.save(distribution);

    this.logger.log(
      `Lead distributed: Listing ${listingId} -> Subscription ${selectedSubscription.id} -> Contact ${contact.id}`,
    );

    // Queue metrics update (async)
    await this.rabbitMQService.publishMetricsUpdate(tenantId, listingId, distribution.id);

    return distribution;
  }

  async distributeLeadAsync(
    tenantId: string,
    listingId: string,
    contactData: any,
    metadata: {
      campaignId?: string;
      adsetId?: string;
      adId?: string;
      brand?: string;
      source?: string;
      industry?: string;
    },
  ): Promise<void> {
    // Publish to RabbitMQ for async processing
    await this.rabbitMQService.publishDistribution({
      tenantId,
      listingId,
      contactData,
      metadata,
    });
  }

  private applyWeightDistribution(
    subscriptions: MarketplaceSubscription[],
    listing: Listing,
  ): MarketplaceSubscription {
    // If no weight distribution configured, use priority-based round-robin
    if (!listing.weightDistribution || Object.keys(listing.weightDistribution).length === 0) {
      // Sort by priority (higher first), then by leads delivered (fewer first)
      subscriptions.sort((a, b) => {
        if (b.priority !== a.priority) {
          return b.priority - a.priority;
        }
        return a.leadsDelivered - b.leadsDelivered;
      });

      return subscriptions[0];
    }

    // Apply weight distribution
    // For now, simple implementation - can be enhanced later
    const totalWeight = subscriptions.reduce((sum, sub) => {
      const weight = listing.weightDistribution[sub.id] || 1;
      return sum + weight;
    }, 0);

    let random = Math.random() * totalWeight;
    for (const subscription of subscriptions) {
      const weight = listing.weightDistribution[subscription.id] || 1;
      random -= weight;
      if (random <= 0) {
        return subscription;
      }
    }

    // Fallback to first subscription
    return subscriptions[0];
  }

  async refundDistribution(tenantId: string, distributionId: string): Promise<void> {
    const distribution = await this.distributionRepository.findOne({
      where: { id: distributionId, tenantId },
      relations: ['subscription'],
    });

    if (!distribution) {
      throw new NotFoundException('Distribution not found');
    }

    if (distribution.status === DistributionStatus.REFUNDED) {
      throw new BadRequestException('Distribution already refunded');
    }

    // Refund Lead Reservations
    await this.leadReservationService.refund(
      tenantId,
      distribution.subscription.buyerId,
      Number(distribution.leadReservationsCharged),
      {
        distributionId,
        reason: 'Distribution refunded',
      },
    );

    // Update distribution status
    distribution.status = DistributionStatus.REFUNDED;
    await this.distributionRepository.save(distribution);

    // Update subscription counters
    const subscription = distribution.subscription;
    subscription.leadsDelivered = Math.max(0, subscription.leadsDelivered - 1);
    subscription.leadReservationsSpent = Math.max(
      0,
      Number(subscription.leadReservationsSpent) - Number(distribution.leadReservationsCharged),
    );
    await this.subscriptionRepository.save(subscription);
  }
}

