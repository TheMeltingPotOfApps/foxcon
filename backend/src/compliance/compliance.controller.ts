import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ComplianceService } from './compliance.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../entities/user-role.enum';
import { SuperAdminGuard } from '../common/guards/super-admin.guard';

@Controller('compliance')
@UseGuards(JwtAuthGuard, RolesGuard, SuperAdminGuard)
@Roles(UserRole.SUPER_ADMIN)
export class ComplianceController {
  constructor(private readonly complianceService: ComplianceService) {}

  @Get('tenants')
  async getAllTenantsCompliance() {
    return this.complianceService.getAllTenantsCompliance();
  }

  @Get('tenants/:tenantId')
  async getTenantCompliance(@Param('tenantId') tenantId: string) {
    return this.complianceService.getTenantComplianceSummary(tenantId);
  }

  @Get('tenants/:tenantId/templates')
  async getTenantTemplatesCompliance(@Param('tenantId') tenantId: string) {
    return this.complianceService.checkTenantTemplates(tenantId);
  }

  @Get('templates/:templateId')
  async getTemplateCompliance(@Param('templateId') templateId: string) {
    return this.complianceService.checkTemplate(templateId);
  }
}

