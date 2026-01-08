import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserTenant } from '../../entities/user-tenant.entity';
import { UserRole } from '../../entities/user-role.enum';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  constructor(
    @InjectRepository(UserTenant)
    private userTenantRepository: Repository<UserTenant>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Super admin access required');
    }

    // Verify only one super admin exists
    const superAdminCount = await this.userTenantRepository.count({
      where: { role: UserRole.SUPER_ADMIN, isActive: true },
    });

    if (superAdminCount > 1) {
      throw new ForbiddenException('Multiple super admins detected. Only one super admin account is allowed.');
    }

    // Verify this user is the super admin
    const userTenant = await this.userTenantRepository.findOne({
      where: {
        userId: user.userId,
        tenantId: user.tenantId,
        role: UserRole.SUPER_ADMIN,
        isActive: true,
      },
    });

    if (!userTenant) {
      throw new ForbiddenException('Super admin access not found');
    }

    return true;
  }
}

