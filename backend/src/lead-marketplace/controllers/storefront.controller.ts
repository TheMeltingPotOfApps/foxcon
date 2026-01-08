import {
  Controller,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import { ListingService } from '../services/listing.service';
import { ListingStatus } from '../entities/listing.entity';

@Controller('nurture-leads/storefront')
export class StorefrontController {
  constructor(private readonly listingService: ListingService) {}

  @Get('listings')
  async getPublicListings(
    @Query('tenantId') tenantId: string,
    @Query('industry') industry?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('isVerified') isVerified?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    // Public endpoint - only show active listings
    return this.listingService.findAll(
      tenantId,
      {
        status: ListingStatus.ACTIVE,
        industry,
        isVerified: isVerified === 'true' ? true : undefined,
        minPrice: minPrice ? parseFloat(minPrice) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      },
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  @Get('listings/:id')
  async getPublicListing(@Param('id') id: string, @Query('tenantId') tenantId: string) {
    return this.listingService.findOne(tenantId, id);
  }
}

