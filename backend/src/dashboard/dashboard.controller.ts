import { Controller, Get, Query, UseGuards, Param } from '@nestjs/common';
import { DashboardService, DashboardStats, JourneyActivityLog } from './dashboard.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, TenantGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  async getStats(
    @TenantId() tenantId: string,
    @Query('timeRange') timeRange?: 'today' | 'week' | 'month' | 'all',
  ): Promise<DashboardStats> {
    return this.dashboardService.getStats(tenantId, timeRange || 'all');
  }

  @Get('journey/:journeyId/activity-logs')
  async getJourneyActivityLogs(
    @TenantId() tenantId: string,
    @Param('journeyId') journeyId: string,
    @Query('limit') limit?: string,
  ): Promise<JourneyActivityLog[]> {
    return this.dashboardService.getJourneyActivityLogs(tenantId, journeyId, limit ? parseInt(limit, 10) : 50);
  }

  @Get('call-diagnostics')
  async getCallDiagnostics(@TenantId() tenantId: string) {
    return this.dashboardService.getCallDiagnostics(tenantId);
  }

  @Get('call-capture-diagnostics')
  async getCallCaptureDiagnostics(@TenantId() tenantId: string) {
    return this.dashboardService.getCallCaptureDiagnostics(tenantId);
  }

  @Get('transfer-diagnostics')
  async getTransferDiagnostics(@TenantId() tenantId: string) {
    return this.dashboardService.getTransferDiagnostics(tenantId);
  }
}

