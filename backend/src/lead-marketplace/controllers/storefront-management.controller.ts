import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { StorefrontManagementService } from '../services/storefront-management.service';
import { MarketplaceRoleGuard } from '../guards/marketplace-role.guard';

@Controller('nurture-leads/storefront')
export class StorefrontManagementController {
  constructor(private readonly storefrontService: StorefrontManagementService) {}

  @Get('public/:slug')
  async getPublicStorefront(@TenantId() tenantId: string, @Param('slug') slug: string) {
    return this.storefrontService.getStorefront(tenantId, slug);
  }

  @Get('preview')
  @UseGuards(JwtAuthGuard, TenantGuard, MarketplaceRoleGuard)
  async getStorefrontPreview(@TenantId() tenantId: string, @CurrentUser() user: any) {
    return this.storefrontService.getStorefrontPreview(tenantId, user.userId);
  }

  @Put('settings')
  @UseGuards(JwtAuthGuard, TenantGuard, MarketplaceRoleGuard)
  async updateStorefrontSettings(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Body() body: {
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
  ) {
    return this.storefrontService.updateStorefrontSettings(tenantId, user.userId, body);
  }

  @Put('slug')
  @UseGuards(JwtAuthGuard, TenantGuard, MarketplaceRoleGuard)
  async updateStorefrontSlug(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Body() body: { slug: string },
  ) {
    return this.storefrontService.updateStorefrontSlug(tenantId, user.userId, body.slug);
  }
}


