import {
  Controller,
  Get,
  UseGuards,
  Query,
  Param,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { PbxReportingService } from './services/pbx-reporting.service';

@Controller('pbx/reporting')
@UseGuards(JwtAuthGuard, TenantGuard)
export class PbxReportingController {
  constructor(private reportingService: PbxReportingService) {}

  @Get('realtime')
  async getRealTimeStats(@TenantId() tenantId: string) {
    return await this.reportingService.getRealTimeStats(tenantId);
  }

  @Get('agent/:agentId/metrics')
  async getAgentMetrics(
    @TenantId() tenantId: string,
    @Param('agentId') agentId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return await this.reportingService.getAgentMetrics(
      tenantId,
      agentId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('queue/:queueId/metrics')
  async getQueueMetrics(
    @TenantId() tenantId: string,
    @Param('queueId') queueId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return await this.reportingService.getQueueMetrics(
      tenantId,
      queueId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('team/metrics')
  async getTeamMetrics(
    @TenantId() tenantId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return await this.reportingService.getTeamMetrics(
      tenantId,
      new Date(startDate),
      new Date(endDate),
    );
  }
}

