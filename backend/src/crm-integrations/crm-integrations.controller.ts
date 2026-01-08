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
} from '@nestjs/common';
import { CrmIntegrationsService, CreateCrmIntegrationDto, UpdateCrmIntegrationDto } from './crm-integrations.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('crm-integrations')
@UseGuards(JwtAuthGuard, TenantGuard)
export class CrmIntegrationsController {
  constructor(private readonly crmIntegrationsService: CrmIntegrationsService) {}

  @Post()
  async create(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateCrmIntegrationDto,
  ) {
    return this.crmIntegrationsService.createForEngine(
      tenantId,
      user.userId || user.sub,
      dto,
    );
  }

  @Get()
  async findAll(@TenantId() tenantId: string) {
    return this.crmIntegrationsService.findAllForEngine(tenantId);
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.crmIntegrationsService.findOne(id);
  }

  @Put(':id')
  async update(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCrmIntegrationDto,
  ) {
    return this.crmIntegrationsService.update(id, dto, tenantId);
  }

  @Delete(':id')
  async delete(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.crmIntegrationsService.delete(id, tenantId);
    return { success: true };
  }

  @Post(':id/test')
  async testConnection(@Param('id', ParseUUIDPipe) id: string) {
    return this.crmIntegrationsService.testConnection(id);
  }
}

