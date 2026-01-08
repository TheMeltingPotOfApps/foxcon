import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MarketplaceUser, MarketplaceUserType } from '../entities/marketplace-user.entity';
import { Listing, ListingStatus } from '../entities/listing.entity';
import { ListingReview } from '../entities/listing-review.entity';
import { ListingMetrics } from '../entities/listing-metrics.entity';

@Injectable()
export class StorefrontManagementService {
  private readonly logger = new Logger(StorefrontManagementService.name);

  constructor(
    @InjectRepository(MarketplaceUser)
    private marketplaceUserRepository: Repository<MarketplaceUser>,
    @InjectRepository(Listing)
    private listingRepository: Repository<Listing>,
    @InjectRepository(ListingReview)
    private reviewRepository: Repository<ListingReview>,
    @InjectRepository(ListingMetrics)
    private metricsRepository: Repository<ListingMetrics>,
  ) {}

  async getStorefront(tenantId: string, slug: string) {
    const marketplaceUser = await this.marketplaceUserRepository.findOne({
      where: { tenantId, storefrontSlug: slug },
      relations: ['user'],
    });

    if (!marketplaceUser) {
      throw new NotFoundException('Storefront not found');
    }

    if (
      marketplaceUser.userType !== MarketplaceUserType.MARKETER &&
      marketplaceUser.userType !== MarketplaceUserType.BOTH
    ) {
      throw new BadRequestException('User is not a marketer');
    }

    // Get all active listings for this marketer
    const listings = await this.listingRepository.find({
      where: {
        tenantId,
        marketerId: marketplaceUser.userId,
        status: ListingStatus.ACTIVE,
      },
      relations: ['metrics'],
      order: { createdAt: 'DESC' },
    });

    // Get reviews for all listings
    const listingIds = listings.map((l) => l.id);
    const reviews = listingIds.length > 0
      ? await this.reviewRepository.find({
          where: { tenantId, listingId: listingIds as any },
        })
      : [];

    // Calculate aggregate metrics
    const totalLeadsDelivered = listings.reduce((sum, listing) => {
      return sum + (listing.metrics?.[0]?.totalLeadsDelivered || 0);
    }, 0);

    const averageRating = reviews.length > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
      : 0;

    return {
      marketplaceUser: {
        id: marketplaceUser.id,
        companyName: marketplaceUser.companyName,
        storefrontSlug: marketplaceUser.storefrontSlug,
        isVerified: marketplaceUser.isVerified,
        storefrontSettings: marketplaceUser.storefrontSettings,
      },
      listings: listings.map((listing) => ({
        id: listing.id,
        name: listing.name,
        description: listing.description,
        industry: listing.industry,
        pricePerLead: listing.pricePerLead,
        isVerified: listing.isVerified,
        leadParameters: listing.leadParameters,
        metrics: listing.metrics?.[0] || null,
        reviewCount: reviews.filter((r) => r.listingId === listing.id).length,
      })),
      aggregateMetrics: {
        totalListings: listings.length,
        totalLeadsDelivered,
        averageRating: Math.round(averageRating * 10) / 10,
        totalReviews: reviews.length,
      },
    };
  }

  async updateStorefrontSettings(
    tenantId: string,
    userId: string,
    settings: {
      bannerImage?: string;
      logo?: string;
      description?: string;
      primaryColor?: string;
      secondaryColor?: string;
      customCss?: string;
      socialLinks?: {
        website?: string;
        twitter?: string;
        linkedin?: string;
        facebook?: string;
      };
    },
  ): Promise<MarketplaceUser> {
    const marketplaceUser = await this.marketplaceUserRepository.findOne({
      where: { tenantId, userId },
    });

    if (!marketplaceUser) {
      throw new NotFoundException('Marketplace user not found');
    }

    if (
      marketplaceUser.userType !== MarketplaceUserType.MARKETER &&
      marketplaceUser.userType !== MarketplaceUserType.BOTH
    ) {
      throw new BadRequestException('Only marketers can update storefront settings');
    }

    marketplaceUser.storefrontSettings = {
      ...(marketplaceUser.storefrontSettings || {}),
      ...settings,
    };

    return this.marketplaceUserRepository.save(marketplaceUser);
  }

  async updateStorefrontSlug(tenantId: string, userId: string, newSlug: string): Promise<MarketplaceUser> {
    const marketplaceUser = await this.marketplaceUserRepository.findOne({
      where: { tenantId, userId },
    });

    if (!marketplaceUser) {
      throw new NotFoundException('Marketplace user not found');
    }

    if (
      marketplaceUser.userType !== MarketplaceUserType.MARKETER &&
      marketplaceUser.userType !== MarketplaceUserType.BOTH
    ) {
      throw new BadRequestException('Only marketers can update storefront slug');
    }

    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(newSlug)) {
      throw new BadRequestException('Slug can only contain lowercase letters, numbers, and hyphens');
    }

    if (newSlug.length < 3 || newSlug.length > 50) {
      throw new BadRequestException('Slug must be between 3 and 50 characters');
    }

    // Check if slug is already taken
    const existing = await this.marketplaceUserRepository.findOne({
      where: { tenantId, storefrontSlug: newSlug },
    });

    if (existing && existing.id !== marketplaceUser.id) {
      throw new BadRequestException('Storefront slug already taken');
    }

    marketplaceUser.storefrontSlug = newSlug;
    return this.marketplaceUserRepository.save(marketplaceUser);
  }

  async getStorefrontPreview(tenantId: string, userId: string) {
    const marketplaceUser = await this.marketplaceUserRepository.findOne({
      where: { tenantId, userId },
    });

    if (!marketplaceUser) {
      throw new NotFoundException('Marketplace user not found');
    }

    if (!marketplaceUser.storefrontSlug) {
      throw new BadRequestException('Storefront slug not set');
    }

    return this.getStorefront(tenantId, marketplaceUser.storefrontSlug);
  }
}


