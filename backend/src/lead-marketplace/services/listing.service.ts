import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Listing, ListingStatus } from '../entities/listing.entity';
import { ListingMetrics } from '../entities/listing-metrics.entity';
import { Campaign } from '../../entities/campaign.entity';
import { LeadSource } from '../entities/lead-source.entity';

@Injectable()
export class ListingService {
  private readonly logger = new Logger(ListingService.name);

  constructor(
    @InjectRepository(Listing)
    private listingRepository: Repository<Listing>,
    @InjectRepository(ListingMetrics)
    private metricsRepository: Repository<ListingMetrics>,
    @InjectRepository(Campaign)
    private campaignRepository: Repository<Campaign>,
    @InjectRepository(LeadSource)
    private leadSourceRepository: Repository<LeadSource>,
  ) {}

  async create(tenantId: string, marketerId: string, data: Partial<Listing>): Promise<Listing> {
    // Validate campaign if provided
    if (data.campaignId) {
      const campaign = await this.campaignRepository.findOne({
        where: { id: data.campaignId, tenantId },
      });

      if (!campaign) {
        throw new NotFoundException('Campaign not found');
      }
    }

    const listing = this.listingRepository.create({
      tenantId,
      marketerId,
      ...data,
      status: data.status || ListingStatus.DRAFT,
    });

    const savedListing = await this.listingRepository.save(listing);

    // Create initial metrics
    await this.metricsRepository.save({
      tenantId,
      listingId: savedListing.id,
      totalLeadsDelivered: 0,
      contactRate: 0,
      dncRate: 0,
      soldCount: 0,
    });

    // Create lead source if campaign/platform info provided
    if (data.campaignId || data.adsetId || data.adId) {
      await this.leadSourceRepository.save({
        tenantId,
        listingId: savedListing.id,
        platform: data.adsetId ? 'FACEBOOK' : 'CUSTOM',
        campaignId: data.campaignId,
        adsetId: data.adsetId,
        adId: data.adId,
        industry: data.industry,
      });
    }

    return savedListing;
  }

  async findAll(
    tenantId: string,
    filters?: {
      status?: ListingStatus;
      marketerId?: string;
      industry?: string;
      isVerified?: boolean;
      minPrice?: number;
      maxPrice?: number;
    },
    page: number = 1,
    limit: number = 50,
  ): Promise<{ listings: Listing[]; total: number }> {
    const skip = (page - 1) * limit;
    const queryBuilder = this.listingRepository
      .createQueryBuilder('listing')
      .where('listing.tenantId = :tenantId', { tenantId })
      .leftJoinAndSelect('listing.metrics', 'metrics')
      .leftJoinAndSelect('listing.marketer', 'marketer')
      .orderBy('listing.createdAt', 'DESC');

    if (filters?.status) {
      queryBuilder.andWhere('listing.status = :status', { status: filters.status });
    }

    if (filters?.marketerId) {
      queryBuilder.andWhere('listing.marketerId = :marketerId', { marketerId: filters.marketerId });
    }

    if (filters?.industry) {
      queryBuilder.andWhere('listing.industry = :industry', { industry: filters.industry });
    }

    if (filters?.isVerified !== undefined) {
      queryBuilder.andWhere('listing.isVerified = :isVerified', { isVerified: filters.isVerified });
    }

    if (filters?.minPrice !== undefined) {
      queryBuilder.andWhere('listing.pricePerLead >= :minPrice', { minPrice: filters.minPrice });
    }

    if (filters?.maxPrice !== undefined) {
      queryBuilder.andWhere('listing.pricePerLead <= :maxPrice', { maxPrice: filters.maxPrice });
    }

    try {
      const [listings, total] = await queryBuilder.skip(skip).take(limit).getManyAndCount();
      
      // Load metrics separately if join didn't work
      for (const listing of listings) {
        if (!listing.metrics) {
          const metrics = await this.metricsRepository.findOne({
            where: { listingId: listing.id, tenantId },
          });
          if (metrics) {
            (listing as any).metrics = metrics;
          }
        }
      }
      
      return { listings, total };
    } catch (error) {
      this.logger.error(`Error fetching listings: ${error.message}`, error.stack);
      // Fallback to simple query if join fails
      const where: any = { tenantId };
      if (filters?.status) where.status = filters.status;
      if (filters?.marketerId) where.marketerId = filters.marketerId;
      if (filters?.industry) where.industry = filters.industry;
      if (filters?.isVerified !== undefined) where.isVerified = filters.isVerified;
      
      const [listings, total] = await this.listingRepository.findAndCount({
        where,
        skip,
        take: limit,
        order: { createdAt: 'DESC' },
      });
      
      // Load metrics for each listing
      for (const listing of listings) {
        const metrics = await this.metricsRepository.findOne({
          where: { listingId: listing.id, tenantId },
        });
        if (metrics) {
          (listing as any).metrics = metrics;
        }
      }
      
      return { listings, total };
    }
  }

  async findOne(tenantId: string, listingId: string): Promise<Listing> {
    const listing = await this.listingRepository.findOne({
      where: { id: listingId, tenantId },
      relations: ['metrics', 'marketer'],
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    return listing;
  }

  async update(tenantId: string, listingId: string, marketerId: string, data: Partial<Listing>): Promise<Listing> {
    const listing = await this.findOne(tenantId, listingId);

    // Verify ownership
    if (listing.marketerId !== marketerId) {
      throw new BadRequestException('You do not have permission to update this listing');
    }

    // Validate campaign if provided
    if (data.campaignId) {
      const campaign = await this.campaignRepository.findOne({
        where: { id: data.campaignId, tenantId },
      });

      if (!campaign) {
        throw new NotFoundException('Campaign not found');
      }
    }

    Object.assign(listing, data);
    return this.listingRepository.save(listing);
  }

  async publish(tenantId: string, listingId: string, marketerId: string): Promise<Listing> {
    const listing = await this.findOne(tenantId, listingId);

    if (listing.marketerId !== marketerId) {
      throw new BadRequestException('You do not have permission to publish this listing');
    }

    if (listing.status !== ListingStatus.DRAFT) {
      throw new BadRequestException('Only draft listings can be published');
    }

    listing.status = ListingStatus.ACTIVE;
    return this.listingRepository.save(listing);
  }

  async pause(tenantId: string, listingId: string, marketerId: string): Promise<Listing> {
    const listing = await this.findOne(tenantId, listingId);

    if (listing.marketerId !== marketerId) {
      throw new BadRequestException('You do not have permission to pause this listing');
    }

    listing.status = ListingStatus.PAUSED;
    return this.listingRepository.save(listing);
  }

  async delete(tenantId: string, listingId: string, marketerId: string): Promise<void> {
    const listing = await this.findOne(tenantId, listingId);

    if (listing.marketerId !== marketerId) {
      throw new BadRequestException('You do not have permission to delete this listing');
    }

    await this.listingRepository.remove(listing);
  }

  async getMetrics(tenantId: string, listingId: string): Promise<ListingMetrics> {
    const metrics = await this.metricsRepository.findOne({
      where: { listingId, tenantId },
    });

    if (!metrics) {
      throw new NotFoundException('Metrics not found');
    }

    return metrics;
  }
}

