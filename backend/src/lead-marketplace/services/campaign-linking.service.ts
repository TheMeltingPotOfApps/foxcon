import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LeadSource } from '../entities/lead-source.entity';
import { Listing } from '../entities/listing.entity';
import { Campaign } from '../../entities/campaign.entity';

@Injectable()
export class CampaignLinkingService {
  private readonly logger = new Logger(CampaignLinkingService.name);

  constructor(
    @InjectRepository(LeadSource)
    private leadSourceRepository: Repository<LeadSource>,
    @InjectRepository(Listing)
    private listingRepository: Repository<Listing>,
    @InjectRepository(Campaign)
    private campaignRepository: Repository<Campaign>,
  ) {}

  async linkCampaignToListing(
    tenantId: string,
    listingId: string,
    marketerId: string,
    campaignId: string,
    metadata?: {
      adsetId?: string;
      adId?: string;
      brand?: string;
      source?: string;
      industry?: string;
    },
  ): Promise<LeadSource> {
    // Verify listing exists and belongs to marketer
    const listing = await this.listingRepository.findOne({
      where: { id: listingId, tenantId, marketerId },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found or you do not have permission');
    }

    // Verify campaign exists and belongs to tenant
    const campaign = await this.campaignRepository.findOne({
      where: { id: campaignId, tenantId },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found or you do not have permission');
    }

    // Check if link already exists
    const existingLink = await this.leadSourceRepository.findOne({
      where: {
        listingId,
        campaignId,
        tenantId,
      },
    });

    if (existingLink) {
      throw new BadRequestException('Campaign is already linked to this listing');
    }

    // Create lead source record
    const leadSource = this.leadSourceRepository.create({
      tenantId,
      listingId,
      platform: 'ENGINE', // Internal Engine campaign
      campaignId,
      adsetId: metadata?.adsetId,
      adId: metadata?.adId,
      brand: metadata?.brand,
      source: metadata?.source,
      industry: metadata?.industry,
    });

    const saved = await this.leadSourceRepository.save(leadSource);

    // Update listing with campaign reference
    listing.campaignId = campaignId;
    listing.adsetId = metadata?.adsetId;
    listing.adId = metadata?.adId;
    await this.listingRepository.save(listing);

    this.logger.log(
      `Campaign ${campaignId} linked to listing ${listingId} for tenant ${tenantId}`,
    );

    return saved;
  }

  async linkExternalCampaign(
    tenantId: string,
    listingId: string,
    marketerId: string,
    platform: 'FACEBOOK' | 'TIKTOK' | 'GOOGLE_ADS' | 'CUSTOM',
    externalCampaignId: string,
    metadata?: {
      adsetId?: string;
      adId?: string;
      brand?: string;
      source?: string;
      industry?: string;
    },
  ): Promise<LeadSource> {
    // Verify listing exists and belongs to marketer
    const listing = await this.listingRepository.findOne({
      where: { id: listingId, tenantId, marketerId },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found or you do not have permission');
    }

    // Create lead source record for external platform
    const leadSource = this.leadSourceRepository.create({
      tenantId,
      listingId,
      platform,
      campaignId: externalCampaignId,
      adsetId: metadata?.adsetId,
      adId: metadata?.adId,
      brand: metadata?.brand,
      source: metadata?.source,
      industry: metadata?.industry,
    });

    const saved = await this.leadSourceRepository.save(leadSource);

    // Update listing with external campaign references
    listing.campaignId = externalCampaignId;
    listing.adsetId = metadata?.adsetId;
    listing.adId = metadata?.adId;
    await this.listingRepository.save(listing);

    this.logger.log(
      `External campaign ${externalCampaignId} (${platform}) linked to listing ${listingId} for tenant ${tenantId}`,
    );

    return saved;
  }

  async getLeadSourcesForListing(
    tenantId: string,
    listingId: string,
  ): Promise<LeadSource[]> {
    return this.leadSourceRepository.find({
      where: { listingId, tenantId },
      order: { createdAt: 'DESC' },
    });
  }

  async unlinkCampaign(
    tenantId: string,
    listingId: string,
    marketerId: string,
    leadSourceId: string,
  ): Promise<void> {
    // Verify listing ownership
    const listing = await this.listingRepository.findOne({
      where: { id: listingId, tenantId, marketerId },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found or you do not have permission');
    }

    const leadSource = await this.leadSourceRepository.findOne({
      where: { id: leadSourceId, listingId, tenantId },
    });

    if (!leadSource) {
      throw new NotFoundException('Lead source not found');
    }

    await this.leadSourceRepository.remove(leadSource);

    // Clear campaign references from listing if this was the only source
    const remainingSources = await this.leadSourceRepository.count({
      where: { listingId, tenantId },
    });

    if (remainingSources === 0) {
      listing.campaignId = null;
      listing.adsetId = null;
      listing.adId = null;
      await this.listingRepository.save(listing);
    }

    this.logger.log(
      `Lead source ${leadSourceId} unlinked from listing ${listingId} for tenant ${tenantId}`,
    );
  }
}

