import {
  Controller,
  Get,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { MarketplaceAnalyticsService } from '../services/marketplace-analytics.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('nurture-leads/analytics')
@UseGuards(JwtAuthGuard, TenantGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: MarketplaceAnalyticsService) {}

  @Get('marketer')
  async getMarketerDashboard(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
  ) {
    return this.analyticsService.getMarketerDashboard(tenantId, user.userId || user.sub);
  }

  @Get('buyer')
  async getBuyerDashboard(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
  ) {
    return this.analyticsService.getBuyerDashboard(tenantId, user.userId || user.sub);
  }
}

