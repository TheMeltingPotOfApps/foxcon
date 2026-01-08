import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ListingReview } from '../entities/listing-review.entity';
import { Listing } from '../entities/listing.entity';
import { MarketplaceSubscription } from '../entities/subscription.entity';

@Injectable()
export class ListingReviewService {
  private readonly logger = new Logger(ListingReviewService.name);

  constructor(
    @InjectRepository(ListingReview)
    private reviewRepository: Repository<ListingReview>,
    @InjectRepository(Listing)
    private listingRepository: Repository<Listing>,
    @InjectRepository(MarketplaceSubscription)
    private subscriptionRepository: Repository<MarketplaceSubscription>,
  ) {}

  async create(
    tenantId: string,
    listingId: string,
    buyerId: string,
    rating: number,
    comment?: string,
  ): Promise<ListingReview> {
    // Validate rating
    if (rating < 1 || rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    // Verify listing exists
    const listing = await this.listingRepository.findOne({
      where: { id: listingId, tenantId },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    // Check if buyer has purchased from this listing (verified purchase)
    const subscription = await this.subscriptionRepository.findOne({
      where: {
        tenantId,
        listingId,
        buyerId,
      },
    });

    const isVerifiedPurchase = !!subscription;

    // Check if review already exists
    const existingReview = await this.reviewRepository.findOne({
      where: { listingId, buyerId, tenantId },
    });

    if (existingReview) {
      // Update existing review
      existingReview.rating = rating;
      existingReview.comment = comment || null;
      existingReview.isVerifiedPurchase = isVerifiedPurchase;
      return this.reviewRepository.save(existingReview);
    }

    // Create new review
    const review = this.reviewRepository.create({
      tenantId,
      listingId,
      buyerId,
      rating,
      comment: comment || null,
      isVerifiedPurchase,
    });

    return this.reviewRepository.save(review);
  }

  async findAll(tenantId: string, listingId: string): Promise<ListingReview[]> {
    return this.reviewRepository.find({
      where: { tenantId, listingId },
      relations: ['buyer'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(tenantId: string, reviewId: string): Promise<ListingReview> {
    const review = await this.reviewRepository.findOne({
      where: { id: reviewId, tenantId },
      relations: ['buyer', 'listing'],
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    return review;
  }

  async update(
    tenantId: string,
    reviewId: string,
    buyerId: string,
    rating?: number,
    comment?: string,
  ): Promise<ListingReview> {
    const review = await this.findOne(tenantId, reviewId);

    if (review.buyerId !== buyerId) {
      throw new BadRequestException('You do not have permission to update this review');
    }

    if (rating !== undefined) {
      if (rating < 1 || rating > 5) {
        throw new BadRequestException('Rating must be between 1 and 5');
      }
      review.rating = rating;
    }

    if (comment !== undefined) {
      review.comment = comment;
    }

    return this.reviewRepository.save(review);
  }

  async delete(tenantId: string, reviewId: string, buyerId: string): Promise<void> {
    const review = await this.findOne(tenantId, reviewId);

    if (review.buyerId !== buyerId) {
      throw new BadRequestException('You do not have permission to delete this review');
    }

    await this.reviewRepository.remove(review);
  }

  async getListingAverageRating(tenantId: string, listingId: string): Promise<{
    averageRating: number;
    totalReviews: number;
    ratingDistribution: { [key: number]: number };
  }> {
    const reviews = await this.reviewRepository.find({
      where: { tenantId, listingId },
    });

    if (reviews.length === 0) {
      return {
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      };
    }

    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / reviews.length;

    const ratingDistribution: { [key: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach((review) => {
      ratingDistribution[review.rating] = (ratingDistribution[review.rating] || 0) + 1;
    });

    return {
      averageRating: Math.round(averageRating * 10) / 10,
      totalReviews: reviews.length,
      ratingDistribution,
    };
  }
}


