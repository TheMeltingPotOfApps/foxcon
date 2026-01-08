import {
  Controller,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { MarketplaceUserRegistrationService } from '../services/marketplace-user-registration.service';
import { MarketplaceRoleGuard } from '../guards/marketplace-role.guard';
import { MarketplaceUserType } from '../entities/marketplace-user.entity';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';

@Controller('nurture-leads/register')
@UseGuards(JwtAuthGuard, TenantGuard)
export class MarketplaceUserRegistrationController {
  constructor(private readonly registrationService: MarketplaceUserRegistrationService) {}

  @Post('marketer')
  async registerAsMarketer(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Body() body: { companyName: string; storefrontSlug?: string },
  ) {
    return this.registrationService.registerAsMarketer(
      tenantId,
      user.userId,
      body.companyName,
      body.storefrontSlug,
    );
  }

  @Post('buyer')
  async registerAsBuyer(@TenantId() tenantId: string, @CurrentUser() user: any) {
    return this.registrationService.registerAsBuyer(tenantId, user.userId);
  }

  @Post('both')
  async registerAsBoth(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Body() body: { companyName: string; storefrontSlug?: string },
  ) {
    return this.registrationService.registerAsBoth(tenantId, user.userId, body.companyName, body.storefrontSlug);
  }

  @Put('storefront-settings')
  @UseGuards(MarketplaceRoleGuard)
  async updateStorefrontSettings(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Body() body: { settings: Record<string, any> },
  ) {
    return this.registrationService.updateStorefrontSettings(tenantId, user.userId, body.settings);
  }

  @Post('verify/:userId')
  @UseGuards(SuperAdminGuard)
  async verifyMarketer(@TenantId() tenantId: string, @Param('userId') userId: string) {
    return this.registrationService.verifyMarketer(tenantId, userId);
  }
}

