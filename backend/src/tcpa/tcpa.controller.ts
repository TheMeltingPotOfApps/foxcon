import { Controller, Get, Put, Post, Body, Param, UseGuards, Query } from '@nestjs/common';
import { Tcpaservice } from './tcpa.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { Tcpaconfig, TcpacomplianceMode, TcpaviolationAction } from '../entities/tcpa-config.entity';

@Controller('tcpa')
@UseGuards(JwtAuthGuard, TenantGuard)
export class Tcpacontroller {
  constructor(private readonly tcpaService: Tcpaservice) {}

  @Get('config')
  async getConfig(@TenantId() tenantId: string) {
    return this.tcpaService.getConfig(tenantId);
  }

  @Put('config')
  async updateConfig(
    @TenantId() tenantId: string,
    @Body() updates: Partial<Tcpaconfig>,
  ) {
    return this.tcpaService.updateConfig(tenantId, updates);
  }

  @Get('violations')
  async getViolations(
    @TenantId() tenantId: string,
    @Query('contactId') contactId?: string,
    @Query('journeyId') journeyId?: string,
  ) {
    if (contactId) {
      return this.tcpaService.getContactViolations(tenantId, contactId);
    }
    if (journeyId) {
      return this.tcpaService.getJourneyViolations(tenantId, journeyId);
    }
    return [];
  }

  @Post('violations/:violationId/override')
  async overrideViolation(
    @TenantId() tenantId: string,
    @Param('violationId') violationId: string,
    @Body() body: { reason: string; notes?: string; userId: string },
  ) {
    return this.tcpaService.overrideViolation(
      tenantId,
      violationId,
      body.userId,
      body.reason,
      body.notes,
    );
  }

  @Post('check')
  async checkCompliance(
    @TenantId() tenantId: string,
    @Body() body: {
      contactId: string;
      nodeType: string;
      journeyId?: string;
      nodeId?: string;
      campaignId?: string;
      messageContent?: string;
      isAutomated?: boolean;
      isMarketing?: boolean;
      scheduledTime?: Date;
    },
  ) {
    return this.tcpaService.checkCompliance(tenantId, body.contactId, body.nodeType as any, {
      journeyId: body.journeyId,
      nodeId: body.nodeId,
      campaignId: body.campaignId,
      messageContent: body.messageContent,
      isAutomated: body.isAutomated,
      isMarketing: body.isMarketing,
      scheduledTime: body.scheduledTime,
    });
  }
}

