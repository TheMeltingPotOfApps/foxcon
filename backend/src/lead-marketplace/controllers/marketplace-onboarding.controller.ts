import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { MarketplaceOnboardingService } from '../services/marketplace-onboarding.service';
import { MarketplaceOnboardingStep } from '../entities/marketplace-onboarding-progress.entity';

@Controller('nurture-leads/onboarding')
@UseGuards(JwtAuthGuard, TenantGuard)
export class MarketplaceOnboardingController {
  constructor(private readonly onboardingService: MarketplaceOnboardingService) {}

  @Get('progress')
  async getProgress(@TenantId() tenantId: string, @CurrentUser() user: any) {
    return this.onboardingService.getProgress(tenantId, user.userId);
  }

  @Post('step')
  async updateStep(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Body() body: { step: MarketplaceOnboardingStep; data?: any },
  ) {
    return this.onboardingService.updateStep(tenantId, user.userId, body.step, body.data);
  }

  @Post('skip')
  async skipOnboarding(@TenantId() tenantId: string, @CurrentUser() user: any) {
    return this.onboardingService.skipOnboarding(tenantId, user.userId);
  }
}


