import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { Campaign } from '../entities/campaign.entity';

@Controller('campaigns')
@UseGuards(JwtAuthGuard, TenantGuard)
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Post()
  async create(
    @TenantId() tenantId: string,
    @Body() data: Partial<Campaign>,
  ) {
    return this.campaignsService.create(tenantId, data);
  }

  @Get()
  async findAll(@TenantId() tenantId: string) {
    return this.campaignsService.findAll(tenantId);
  }

  @Get(':id')
  async findOne(
    @TenantId() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.campaignsService.findOne(tenantId, id);
  }

  @Post(':id/launch')
  async launch(
    @TenantId() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.campaignsService.launch(tenantId, id);
  }

  @Post(':id/pause')
  async pause(
    @TenantId() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.campaignsService.pause(tenantId, id);
  }

  @Put(':id')
  async update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() data: Partial<Campaign>,
  ) {
    return this.campaignsService.update(tenantId, id, data);
  }

  @Post(':id/contacts')
  async addContacts(
    @TenantId() tenantId: string,
    @Param('id') campaignId: string,
    @Body() body: { contactIds: string[] },
  ) {
    await this.campaignsService.addContacts(
      tenantId,
      campaignId,
      body.contactIds,
    );
    return { success: true };
  }

  @Post(':id/import-csv')
  async importCsv(
    @TenantId() tenantId: string,
    @Param('id') campaignId: string,
    @Body() body: { contacts: Array<{ phone: string; firstName?: string; lastName?: string; email?: string }> },
  ) {
    return this.campaignsService.importContactsFromCsv(tenantId, campaignId, body.contacts);
  }
}

