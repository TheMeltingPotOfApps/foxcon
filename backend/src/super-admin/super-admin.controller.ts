import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SuperAdminService } from './super-admin.service';
import { SuperAdminManagementService } from './super-admin-management.service';
import { TenantLimitsService } from '../tenant-limits/tenant-limits.service';
import { PricingPlansService } from '../pricing-plans/pricing-plans.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { SuperAdminGuard } from '../common/guards/super-admin.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../entities/user-role.enum';
import { TenantLimits } from '../entities/tenant-limits.entity';
import { PricingPlan } from '../entities/pricing-plan.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserTenant } from '../entities/user-tenant.entity';
import { CreateTenantDto, UpdateTenantDto, ChangeTenantPlanDto } from './dto/manage-tenant.dto';
import { CreateUserDto, UpdateUserDto, ChangeUserRoleDto, AssignUserToTenantDto } from './dto/manage-user.dto';
import { UpdatePricingDto, CreateStripePriceDto } from './dto/update-pricing.dto';

@Controller('super-admin')
@UseGuards(JwtAuthGuard, RolesGuard, SuperAdminGuard)
@Roles(UserRole.SUPER_ADMIN)
export class SuperAdminController {
  constructor(
    private superAdminService: SuperAdminService,
    private superAdminManagementService: SuperAdminManagementService,
    private tenantLimitsService: TenantLimitsService,
    private pricingPlansService: PricingPlansService,
    @InjectRepository(UserTenant)
    private userTenantRepository: Repository<UserTenant>,
  ) {}

  @Get('tenants')
  async getAllTenants() {
    return this.superAdminService.getAllTenants();
  }

  @Get('tenants/:id')
  async getTenantDetails(@Param('id') id: string) {
    return this.superAdminService.getTenantDetails(id);
  }

  @Get('tenants/:id/templates')
  async getTenantTemplates(@Param('id') tenantId: string) {
    return this.superAdminService.getTenantTemplates(tenantId);
  }

  @Get('stats')
  async getSystemStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.superAdminService.getSystemStats(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('traffic')
  async getTrafficAnalytics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.superAdminService.getTrafficAnalytics(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('activities')
  async getAllTenantActivities(
    @Query('tenantId') tenantId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: number,
  ) {
    return this.superAdminService.getAllTenantActivities({
      tenantId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? parseInt(limit.toString()) : undefined,
    });
  }

  @Get('current')
  async getCurrentSuperAdmin() {
    return this.superAdminService.getSuperAdmin();
  }

  // Tenant Limits Management
  @Get('tenants/:id/limits')
  async getTenantLimits(@Param('id') tenantId: string) {
    return this.tenantLimitsService.getOrCreateLimits(tenantId);
  }

  @Put('tenants/:id/limits')
  async updateTenantLimits(
    @Param('id') tenantId: string,
    @Body() updates: Partial<TenantLimits>,
  ) {
    return this.tenantLimitsService.updateLimits(tenantId, updates);
  }

  @Post('tenants/:id/limits/plan')
  async updateTenantPlan(
    @Param('id') tenantId: string,
    @Body() body: { planName: string },
  ) {
    return this.tenantLimitsService.updatePlan(tenantId, body.planName);
  }

  // Pricing Plans Management
  @Get('pricing-plans')
  async getAllPricingPlans() {
    return this.pricingPlansService.findAll();
  }

  @Get('pricing-plans/:id')
  async getPricingPlan(@Param('id') id: string) {
    return this.pricingPlansService.findOne(id);
  }

  @Post('pricing-plans')
  async createPricingPlan(@Body() data: Partial<PricingPlan>) {
    return this.pricingPlansService.create(data);
  }

  @Put('pricing-plans/:id')
  async updatePricingPlan(
    @Param('id') id: string,
    @Body() updates: Partial<PricingPlan>,
  ) {
    return this.pricingPlansService.update(id, updates);
  }

  @Delete('pricing-plans/:id')
  async deletePricingPlan(@Param('id') id: string) {
    await this.pricingPlansService.delete(id);
    return { success: true };
  }

  @Post('pricing-plans/:id/set-default')
  async setDefaultPricingPlan(@Param('id') id: string) {
    return this.pricingPlansService.setDefault(id);
  }

  // ==================== PRICING MANAGEMENT (STRIPE) ====================

  @Get('pricing/stripe')
  async getStripePricing() {
    return this.superAdminManagementService.getPricingConfig();
  }

  @Post('pricing/stripe/create-price')
  async createStripePrice(@Body() dto: CreateStripePriceDto) {
    return this.superAdminManagementService.createStripePrice(dto);
  }

  @Put('pricing/stripe/update')
  async updatePricing(@Body() dto: UpdatePricingDto) {
    return this.superAdminManagementService.updatePricingConfig(dto);
  }

  // ==================== TENANT MANAGEMENT ====================

  @Post('tenants')
  async createTenant(@Body() dto: CreateTenantDto) {
    return this.superAdminManagementService.createTenant(dto);
  }

  @Put('tenants/:id')
  async updateTenant(@Param('id') id: string, @Body() dto: UpdateTenantDto) {
    return this.superAdminManagementService.updateTenant(id, dto);
  }

  @Delete('tenants/:id')
  @HttpCode(HttpStatus.OK)
  async deleteTenant(@Param('id') id: string) {
    await this.superAdminManagementService.deleteTenant(id);
    return { success: true };
  }

  @Post('tenants/:id/change-plan')
  async changeTenantPlan(@Param('id') id: string, @Body() dto: ChangeTenantPlanDto) {
    return this.superAdminManagementService.changeTenantPlan(id, dto);
  }

  // ==================== USER MANAGEMENT ====================

  @Get('users')
  async getAllUsers() {
    return this.superAdminManagementService.getAllUsers();
  }

  @Get('tenants/:tenantId/users')
  async getTenantUsers(@Param('tenantId') tenantId: string) {
    return this.superAdminManagementService.getTenantUsers(tenantId);
  }

  @Post('users')
  async createUser(@Body() dto: CreateUserDto) {
    return this.superAdminManagementService.createUser(dto);
  }

  @Put('users/:id')
  async updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.superAdminManagementService.updateUser(id, dto);
  }

  @Delete('users/:id')
  @HttpCode(HttpStatus.OK)
  async deleteUser(@Param('id') id: string) {
    await this.superAdminManagementService.deleteUser(id);
    return { success: true };
  }

  @Post('users/:id/change-role')
  async changeUserRole(@Param('id') id: string, @Body() dto: ChangeUserRoleDto) {
    return this.superAdminManagementService.changeUserRole(id, dto);
  }

  @Post('users/:id/assign-tenant')
  async assignUserToTenant(@Param('id') id: string, @Body() dto: AssignUserToTenantDto) {
    return this.superAdminManagementService.assignUserToTenant(id, dto);
  }

  @Delete('users/:id/tenants/:tenantId')
  @HttpCode(HttpStatus.OK)
  async removeUserFromTenant(@Param('id') id: string, @Param('tenantId') tenantId: string) {
    await this.superAdminManagementService.removeUserFromTenant(id, tenantId);
    return { success: true };
  }

  // ==================== SUBSCRIPTION MANAGEMENT ====================

  @Get('tenants/:id/subscription')
  async getTenantSubscription(@Param('id') tenantId: string) {
    return this.superAdminService.getTenantDetails(tenantId);
  }
}
