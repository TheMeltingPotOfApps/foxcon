import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { TenantLimitsService } from './tenant-limits.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';

@Controller('tenant-limits')
@UseGuards(JwtAuthGuard, TenantGuard)
export class TenantLimitsController {
  constructor(private readonly tenantLimitsService: TenantLimitsService) {}

  @Get()
  async getLimits(@TenantId() tenantId: string) {
    return this.tenantLimitsService.getOrCreateLimits(tenantId);
  }
}

