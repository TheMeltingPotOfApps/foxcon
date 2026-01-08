import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ListingReviewService } from '../services/listing-review.service';

@Controller('nurture-leads/reviews')
@UseGuards(JwtAuthGuard, TenantGuard)
export class ListingReviewController {
  constructor(private readonly reviewService: ListingReviewService) {}

  @Post('listings/:listingId')
  async createReview(
    @TenantId() tenantId: string,
    @Param('listingId') listingId: string,
    @CurrentUser() user: any,
    @Body() body: { rating: number; comment?: string },
  ) {
    return this.reviewService.create(tenantId, listingId, user.userId, body.rating, body.comment);
  }

  @Get('listings/:listingId')
  async getListingReviews(@TenantId() tenantId: string, @Param('listingId') listingId: string) {
    return this.reviewService.findAll(tenantId, listingId);
  }

  @Get('listings/:listingId/stats')
  async getListingRatingStats(@TenantId() tenantId: string, @Param('listingId') listingId: string) {
    return this.reviewService.getListingAverageRating(tenantId, listingId);
  }

  @Get(':reviewId')
  async getReview(@TenantId() tenantId: string, @Param('reviewId') reviewId: string) {
    return this.reviewService.findOne(tenantId, reviewId);
  }

  @Put(':reviewId')
  async updateReview(
    @TenantId() tenantId: string,
    @Param('reviewId') reviewId: string,
    @CurrentUser() user: any,
    @Body() body: { rating?: number; comment?: string },
  ) {
    return this.reviewService.update(tenantId, reviewId, user.userId, body.rating, body.comment);
  }

  @Delete(':reviewId')
  async deleteReview(
    @TenantId() tenantId: string,
    @Param('reviewId') reviewId: string,
    @CurrentUser() user: any,
  ) {
    await this.reviewService.delete(tenantId, reviewId, user.userId);
    return { success: true };
  }
}


