import { Controller, Post, Get, Query, UseGuards, Param, Body } from '@nestjs/common';
import { CallsService } from './calls.service';
import { MakeCallDto, MakeCallResponseDto } from './dto/make-call.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';

@Controller('calls')
@UseGuards(JwtAuthGuard, TenantGuard)
export class CallsController {
  constructor(private readonly callsService: CallsService) {}

  @Post('make-call')
  async makeCall(
    @TenantId() tenantId: string,
    @Body() dto: MakeCallDto,
  ): Promise<MakeCallResponseDto> {
    return this.callsService.makeCall(tenantId, dto);
  }

  @Get('logs')
  async getCallLogs(
    @TenantId() tenantId: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Query('status') status?: string,
  ) {
    return this.callsService.getCallLogs(tenantId, { limit, offset, status });
  }

  @Get('logs/:id')
  async getCallLog(
    @TenantId() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.callsService.getCallLog(tenantId, id);
  }
}
