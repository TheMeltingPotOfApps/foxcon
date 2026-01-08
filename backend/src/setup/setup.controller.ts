import { Controller, Post, Body, BadRequestException, UseGuards, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { UserTenant } from '../entities/user-tenant.entity';
import { Tenant } from '../entities/tenant.entity';
import { UserRole } from '../entities/user-role.enum';
import { SuperAdminService } from '../super-admin/super-admin.service';
import { LeadStatusesService } from '../lead-statuses/lead-statuses.service';
import * as bcrypt from 'bcrypt';

@Controller('setup')
export class SetupController {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserTenant)
    private userTenantRepository: Repository<UserTenant>,
    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,
    private superAdminService: SuperAdminService,
    @Inject(forwardRef(() => LeadStatusesService))
    private leadStatusesService: LeadStatusesService,
  ) {}

  /**
   * Initial setup endpoint to create the first super admin
   * This should only be called once during initial setup
   */
  @Post('create-super-admin')
  async createSuperAdmin(@Body() body: { email: string; password: string; firstName?: string; lastName?: string; tenantName: string }) {
    // Check if super admin already exists
    const hasSuperAdmin = await this.superAdminService.hasSuperAdmin();
    if (hasSuperAdmin) {
      throw new BadRequestException('Super admin already exists. Only one super admin account is allowed.');
    }

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: { email: body.email },
    });

    let user: User;
    if (existingUser) {
      user = existingUser;
    } else {
      // Create new user
      const passwordHash = await bcrypt.hash(body.password, 10);
      user = this.userRepository.create({
        email: body.email,
        passwordHash,
        firstName: body.firstName,
        lastName: body.lastName,
        emailVerified: false,
      });
      user = await this.userRepository.save(user);
    }

    // Create or get tenant
    let tenant = await this.tenantRepository.findOne({
      where: { name: body.tenantName },
    });

    if (!tenant) {
      tenant = this.tenantRepository.create({
        name: body.tenantName,
        slug: body.tenantName.toLowerCase().replace(/\s+/g, '-'),
      });
      tenant = await this.tenantRepository.save(tenant);
    }

    // Create or update user-tenant relationship
    let userTenant = await this.userTenantRepository.findOne({
      where: { userId: user.id, tenantId: tenant.id },
    });

    if (userTenant) {
      userTenant.role = UserRole.SUPER_ADMIN;
      userTenant.isActive = true;
    } else {
      userTenant = this.userTenantRepository.create({
        userId: user.id,
        tenantId: tenant.id,
        role: UserRole.SUPER_ADMIN,
        isActive: true,
      });
    }

    await this.userTenantRepository.save(userTenant);

    // Initialize default lead statuses for new tenant
    try {
      await this.leadStatusesService.initializeDefaultStatuses(tenant.id);
    } catch (error) {
      // Log error but don't fail setup if status initialization fails
      console.error('Failed to initialize default lead statuses:', error);
    }

    return {
      success: true,
      message: 'Super admin created successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
      },
    };
  }
}

