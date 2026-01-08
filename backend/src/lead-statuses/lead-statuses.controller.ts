import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { LeadStatusesService } from './lead-statuses.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { CreateTenantLeadStatusDto, UpdateTenantLeadStatusDto } from './dto/create-status.dto';
import { CreateStatusAutomationDto, UpdateStatusAutomationDto } from './dto/create-automation.dto';

@Controller('lead-statuses')
@UseGuards(JwtAuthGuard, TenantGuard)
export class LeadStatusesController {
  constructor(private readonly leadStatusesService: LeadStatusesService) {}

  // ========== Status Endpoints ==========

  @Post()
  async createStatus(
    @TenantId() tenantId: string,
    @Body() dto: CreateTenantLeadStatusDto,
  ) {
    return this.leadStatusesService.createStatus(tenantId, dto);
  }

  @Get()
  async findAllStatuses(
    @TenantId() tenantId: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    const includeInactiveBool = includeInactive === 'true' || includeInactive === '1';
    return this.leadStatusesService.findAllStatuses(tenantId, includeInactiveBool);
  }

  @Get(':id')
  async findOneStatus(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.leadStatusesService.findOneStatus(tenantId, id);
  }

  @Put(':id')
  async updateStatus(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTenantLeadStatusDto,
  ) {
    return this.leadStatusesService.updateStatus(tenantId, id, dto);
  }

  @Delete(':id')
  async deleteStatus(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.leadStatusesService.deleteStatus(tenantId, id);
    return { success: true };
  }

  @Post('reorder')
  async reorderStatuses(
    @TenantId() tenantId: string,
    @Body() body: { statusIds: string[] },
  ) {
    return this.leadStatusesService.reorderStatuses(tenantId, body.statusIds);
  }

  // ========== Automation Endpoints ==========

  @Post('automations')
  async createAutomation(
    @TenantId() tenantId: string,
    @Body() dto: CreateStatusAutomationDto,
  ) {
    return this.leadStatusesService.createAutomation(tenantId, dto);
  }

  @Get('automations')
  async findAllAutomations(
    @TenantId() tenantId: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    const includeInactiveBool = includeInactive === 'true' || includeInactive === '1';
    return this.leadStatusesService.findAllAutomations(tenantId, includeInactiveBool);
  }

  @Get('automations/:id')
  async findOneAutomation(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.leadStatusesService.findOneAutomation(tenantId, id);
  }

  @Put('automations/:id')
  async updateAutomation(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStatusAutomationDto,
  ) {
    return this.leadStatusesService.updateAutomation(tenantId, id, dto);
  }

  @Delete('automations/:id')
  async deleteAutomation(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.leadStatusesService.deleteAutomation(tenantId, id);
    return { success: true };
  }
}

