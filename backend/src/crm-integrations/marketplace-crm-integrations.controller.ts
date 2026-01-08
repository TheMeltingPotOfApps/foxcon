import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
  Req,
} from '@nestjs/common';
import { CrmIntegrationsService, CreateCrmIntegrationDto, UpdateCrmIntegrationDto } from './crm-integrations.service';
import { MarketplaceAuthGuard } from '../marketplace-auth/guards/marketplace-auth.guard';

@Controller('marketplace/crm-integrations')
@UseGuards(MarketplaceAuthGuard)
export class MarketplaceCrmIntegrationsController {
  constructor(private readonly crmIntegrationsService: CrmIntegrationsService) {}

  @Post()
  async create(
    @Req() req: any,
    @Body() dto: CreateCrmIntegrationDto,
  ) {
    return this.crmIntegrationsService.createForMarketplace(
      req.marketplaceUserId,
      dto,
    );
  }

  @Get()
  async findAll(@Req() req: any) {
    return this.crmIntegrationsService.findAllForMarketplace(req.marketplaceUserId);
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.crmIntegrationsService.findOne(id);
  }

  @Put(':id')
  async update(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCrmIntegrationDto,
  ) {
    return this.crmIntegrationsService.update(id, dto, undefined, req.marketplaceUserId);
  }

  @Delete(':id')
  async delete(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.crmIntegrationsService.delete(id, undefined, req.marketplaceUserId);
    return { success: true };
  }

  @Post(':id/test')
  async testConnection(@Param('id', ParseUUIDPipe) id: string) {
    return this.crmIntegrationsService.testConnection(id);
  }
}

