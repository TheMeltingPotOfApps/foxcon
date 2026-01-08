import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { CampaignLinkingService } from '../services/campaign-linking.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('nurture-leads/listings/:listingId/campaigns')
@UseGuards(JwtAuthGuard, TenantGuard)
export class CampaignLinkingController {
  constructor(private readonly campaignLinkingService: CampaignLinkingService) {}

  @Post('link')
  async linkCampaign(
    @TenantId() tenantId: string,
    @Param('listingId', ParseUUIDPipe) listingId: string,
    @CurrentUser() user: any,
    @Body()
    body: {
      campaignId?: string;
      platform?: 'FACEBOOK' | 'TIKTOK' | 'GOOGLE_ADS' | 'CUSTOM';
      externalCampaignId?: string;
      adsetId?: string;
      adId?: string;
      brand?: string;
      source?: string;
      industry?: string;
    },
  ) {
    const marketerId = user.userId || user.sub;

    if (body.campaignId) {
      // Link Engine campaign
      return this.campaignLinkingService.linkCampaignToListing(
        tenantId,
        listingId,
        marketerId,
        body.campaignId,
        {
          adsetId: body.adsetId,
          adId: body.adId,
          brand: body.brand,
          source: body.source,
          industry: body.industry,
        },
      );
    } else if (body.platform && body.externalCampaignId) {
      // Link external platform campaign
      return this.campaignLinkingService.linkExternalCampaign(
        tenantId,
        listingId,
        marketerId,
        body.platform,
        body.externalCampaignId,
        {
          adsetId: body.adsetId,
          adId: body.adId,
          brand: body.brand,
          source: body.source,
          industry: body.industry,
        },
      );
    } else {
      throw new Error('Either campaignId or platform+externalCampaignId must be provided');
    }
  }

  @Get('sources')
  async getLeadSources(
    @TenantId() tenantId: string,
    @Param('listingId', ParseUUIDPipe) listingId: string,
  ) {
    return this.campaignLinkingService.getLeadSourcesForListing(tenantId, listingId);
  }

  @Delete('sources/:leadSourceId')
  async unlinkCampaign(
    @TenantId() tenantId: string,
    @Param('listingId', ParseUUIDPipe) listingId: string,
    @Param('leadSourceId', ParseUUIDPipe) leadSourceId: string,
    @CurrentUser() user: any,
  ) {
    const marketerId = user.userId || user.sub;
    await this.campaignLinkingService.unlinkCampaign(
      tenantId,
      listingId,
      marketerId,
      leadSourceId,
    );
    return { success: true };
  }
}

