import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Contact, LeadStatus } from '../../entities/contact.entity';
import { MarketplaceAnalyticsService } from './marketplace-analytics.service';

@Injectable()
export class EngineSyncService implements OnModuleInit {
  private readonly logger = new Logger(EngineSyncService.name);

  constructor(
    @InjectRepository(Contact)
    private contactRepository: Repository<Contact>,
    private marketplaceAnalyticsService: MarketplaceAnalyticsService,
    private eventEmitter: EventEmitter2,
  ) {}

  onModuleInit() {
    this.logger.log('EngineSyncService initialized - listening for contact status updates');
  }

  @OnEvent('contact.leadStatus.updated')
  async handleLeadStatusUpdate(payload: {
    tenantId: string;
    contactId: string;
    oldStatus: string;
    newStatus: string;
    contact: Contact;
  }) {
    try {
      // Only process if contact has marketplace distribution
      if (!payload.contact.marketplaceDistributionId || !payload.contact.marketplaceListingId) {
        return;
      }

      this.logger.log(
        `Contact ${payload.contactId} status updated from ${payload.oldStatus} to ${payload.newStatus}`,
      );

      // Update listing metrics
      await this.marketplaceAnalyticsService.updateListingMetrics(
        payload.tenantId,
        payload.contact.marketplaceListingId,
      );
    } catch (error) {
      this.logger.error(`Error syncing contact status update: ${error.message}`, error.stack);
    }
  }

  async syncContactStatusToMarketplace(
    tenantId: string,
    contactId: string,
    leadStatus: LeadStatus,
  ): Promise<void> {
    const contact = await this.contactRepository.findOne({
      where: { id: contactId, tenantId },
    });

    if (!contact || !contact.marketplaceListingId) {
      return;
    }

    // Update listing metrics
    await this.marketplaceAnalyticsService.updateListingMetrics(tenantId, contact.marketplaceListingId);
  }
}

