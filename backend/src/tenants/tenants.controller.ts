import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { InviteUserDto, UpdateUserRoleDto } from './dto/invite-user.dto';

@Controller('tenants')
@UseGuards(JwtAuthGuard)
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get('my-tenants')
  async getMyTenants(@CurrentUser() user: any) {
    return this.tenantsService.getUserTenants(user.userId);
  }

  @Get('current')
  @UseGuards(TenantGuard)
  async getCurrentTenant(@TenantId() tenantId: string) {
    return this.tenantsService.getTenantById(tenantId);
  }

  @Get(':id')
  @UseGuards(TenantGuard)
  async getTenant(@Param('id') id: string) {
    return this.tenantsService.getTenantById(id);
  }

  @Patch('current')
  @UseGuards(TenantGuard)
  async updateCurrentTenant(
    @TenantId() tenantId: string,
    @Body() updates: Partial<{ name: string; timezone: string; legalFooterTemplate: string; branding: any; logoUrl: string; slug: string }>,
  ) {
    return this.tenantsService.updateTenant(tenantId, updates);
  }

  @Get('current/team')
  @UseGuards(TenantGuard)
  async getTeamMembers(@TenantId() tenantId: string) {
    return this.tenantsService.getTeamMembers(tenantId);
  }

  @Post('current/team/invite')
  @UseGuards(TenantGuard)
  async inviteUser(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Body() inviteDto: InviteUserDto,
  ) {
    return this.tenantsService.inviteUser(tenantId, inviteDto, user.userId);
  }

  @Patch('current/team/:userTenantId/role')
  @UseGuards(TenantGuard)
  async updateUserRole(
    @TenantId() tenantId: string,
    @Param('userTenantId') userTenantId: string,
    @CurrentUser() user: any,
    @Body() updateDto: UpdateUserRoleDto,
  ) {
    return this.tenantsService.updateUserRole(tenantId, userTenantId, updateDto, user.userId);
  }

  @Delete('current/team/:userTenantId')
  @UseGuards(TenantGuard)
  async removeUser(
    @TenantId() tenantId: string,
    @Param('userTenantId') userTenantId: string,
    @CurrentUser() user: any,
  ) {
    await this.tenantsService.removeUser(tenantId, userTenantId, user.userId);
    return { message: 'User removed from tenant successfully' };
  }
}

