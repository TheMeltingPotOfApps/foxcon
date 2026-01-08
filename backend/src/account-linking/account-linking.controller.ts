import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AccountLinkingService } from './account-linking.service';
import { LinkType } from './entities/account-link.entity';
import { ResourceType, SharingDirection } from './entities/data-sharing-permission.entity';
import { MarketplaceAuthGuard } from '../marketplace-auth/guards/marketplace-auth.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('marketplace/account-linking')
export class AccountLinkingController {
  constructor(private readonly accountLinkingService: AccountLinkingService) {}

  @Post('link')
  @UseGuards(MarketplaceAuthGuard)
  async linkAccounts(
    @Req() req: any,
    @Body() body: { engineUserId: string; engineTenantId: string; linkType?: LinkType },
  ) {
    const marketplaceUserId = req.marketplaceUserId;
    return this.accountLinkingService.linkAccounts(
      body.engineUserId,
      marketplaceUserId,
      body.engineTenantId,
      body.linkType || LinkType.MANUAL,
      marketplaceUserId,
    );
  }

  @Post('link-from-engine')
  @UseGuards(JwtAuthGuard, TenantGuard)
  async linkAccountsFromEngine(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Body() body: { marketplaceUserId: string; linkType?: LinkType },
  ) {
    return this.accountLinkingService.linkAccounts(
      user.userId || user.sub,
      body.marketplaceUserId,
      tenantId,
      body.linkType || LinkType.MANUAL,
      user.userId || user.sub,
    );
  }

  @Get('status')
  @UseGuards(MarketplaceAuthGuard)
  async getLinkStatus(@Req() req: any) {
    const marketplaceUserId = req.marketplaceUserId;
    const link = await this.accountLinkingService.getAccountLink(
      undefined,
      marketplaceUserId,
    );

    if (!link) {
      return { linked: false };
    }

    const permissions = await this.accountLinkingService.getDataSharingPermissions(link.id);

    return {
      linked: true,
      link,
      permissions,
    };
  }

  @Get('status-from-engine')
  @UseGuards(JwtAuthGuard, TenantGuard)
  async getLinkStatusFromEngine(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
  ) {
    const engineUserId = user.userId || user.sub;
    const link = await this.accountLinkingService.getAccountLink(
      engineUserId,
      undefined,
      tenantId,
    );

    if (!link) {
      return { linked: false };
    }

    const permissions = await this.accountLinkingService.getDataSharingPermissions(link.id);

    return {
      linked: true,
      link,
      permissions,
    };
  }

  @Delete('unlink/:linkId')
  @UseGuards(MarketplaceAuthGuard)
  async unlinkAccounts(@Param('linkId') linkId: string) {
    await this.accountLinkingService.unlinkAccounts(linkId);
    return { message: 'Accounts unlinked successfully' };
  }

  @Post('permissions/:linkId')
  @UseGuards(MarketplaceAuthGuard)
  async updatePermissions(
    @Param('linkId') linkId: string,
    @Body()
    body: {
      permissions: {
        resourceType: ResourceType;
        canRead: boolean;
        canWrite: boolean;
        canDelete: boolean;
        sharingDirection: SharingDirection;
      }[];
    },
  ) {
    return this.accountLinkingService.updateDataSharingPermissions(linkId, body.permissions);
  }
}

