import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Query,
  Param,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { LeadReservationService } from '../services/lead-reservation.service';
import { SetExchangeRateDto } from '../dto/set-exchange-rate.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { MarketplaceAdminAnalyticsService } from '../services/marketplace-admin-analytics.service';
import { MarketplaceUserRegistrationService } from '../services/marketplace-user-registration.service';
import { ListingService } from '../services/listing.service';
import { ListingStatus } from '../entities/listing.entity';
import { MarketplaceUserType } from '../entities/marketplace-user.entity';
import { SubscriptionStatus } from '../entities/subscription.entity';

@Controller('nurture-leads/admin')
@UseGuards(JwtAuthGuard, TenantGuard, SuperAdminGuard)
export class MarketplaceAdminController {
  constructor(
    private readonly leadReservationService: LeadReservationService,
    private readonly analyticsService: MarketplaceAdminAnalyticsService,
    private readonly registrationService: MarketplaceUserRegistrationService,
    private readonly listingService: ListingService,
  ) {}

  // Exchange Rate Management
  @Post('exchange-rate')
  async setExchangeRate(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Body() dto: SetExchangeRateDto,
  ) {
    return this.leadReservationService.setExchangeRate(
      dto.rate,
      user.userId || user.sub,
      dto.effectiveFrom,
    );
  }

  @Get('exchange-rate')
  async getExchangeRate() {
    return this.leadReservationService.getActiveExchangeRate();
  }

  // Marketplace Overview & Analytics
  @Get('overview')
  async getMarketplaceOverview(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsService.getMarketplaceOverview(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('analytics/top-marketers')
  async getTopMarketers(@Query('limit') limit?: string) {
    return this.analyticsService.getTopMarketers(limit ? parseInt(limit, 10) : 10);
  }

  @Get('analytics/top-listings')
  async getTopListings(@Query('limit') limit?: string) {
    return this.analyticsService.getTopListings(limit ? parseInt(limit, 10) : 10);
  }

  // Marketplace Users Management
  @Get('users')
  async getAllMarketplaceUsers(
    @Query('userType') userType?: string,
    @Query('isVerified') isVerified?: string,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.analyticsService.getAllMarketplaceUsers({
      userType: userType as MarketplaceUserType,
      isVerified: isVerified === 'true' ? true : isVerified === 'false' ? false : undefined,
      tenantId,
    });
  }

  @Put('users/:userId/verify')
  async verifyMarketer(@TenantId() tenantId: string, @Param('userId') userId: string) {
    return this.registrationService.verifyMarketer(tenantId, userId);
  }

  // Listings Management
  @Get('listings')
  async getAllListings(
    @Query('status') status?: string,
    @Query('isVerified') isVerified?: string,
    @Query('tenantId') tenantId?: string,
    @Query('marketerId') marketerId?: string,
  ) {
    return this.analyticsService.getAllListings({
      status: status as ListingStatus,
      isVerified: isVerified === 'true' ? true : isVerified === 'false' ? false : undefined,
      tenantId,
      marketerId,
    });
  }

  @Get('listings/:listingId')
  async getListingDetails(@TenantId() tenantId: string, @Param('listingId') listingId: string) {
    return this.listingService.findOne(tenantId, listingId);
  }

  // Subscriptions Management
  @Get('subscriptions')
  async getAllSubscriptions(
    @Query('status') status?: string,
    @Query('tenantId') tenantId?: string,
    @Query('buyerId') buyerId?: string,
    @Query('listingId') listingId?: string,
  ) {
    return this.analyticsService.getAllSubscriptions({
      status: status as SubscriptionStatus,
      tenantId,
      buyerId,
      listingId,
    });
  }

  // Transactions Management
  @Get('transactions')
  async getAllTransactions(
    @Query('type') type?: string,
    @Query('tenantId') tenantId?: string,
    @Query('userId') userId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsService.getAllTransactions({
      type,
      tenantId,
      userId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }
}

