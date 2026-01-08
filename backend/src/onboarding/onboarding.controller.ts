import { Controller, Get, Post, Body, UseGuards, Logger } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { OnboardingStep } from '../entities/onboarding-progress.entity';

@Controller('onboarding')
@UseGuards(JwtAuthGuard, TenantGuard)
export class OnboardingController {
  private readonly logger = new Logger(OnboardingController.name);

  constructor(private readonly onboardingService: OnboardingService) {}

  @Get('progress')
  async getProgress(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
  ) {
    try {
    const progress = await this.onboardingService.getProgress(tenantId, user.userId);
    if (!progress) {
      return await this.onboardingService.getOrCreateProgress(tenantId, user.userId);
    }
    return progress;
    } catch (error: any) {
      this.logger.error(`Failed to get onboarding progress: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Post('complete-step')
  async completeStep(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Body() body: { step: OnboardingStep; data?: any },
  ) {
    return this.onboardingService.updateStep(tenantId, user.userId, body.step, body.data);
  }

  @Post('skip')
  async skipOnboarding(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
  ) {
    return this.onboardingService.skipOnboarding(tenantId, user.userId);
  }
}

