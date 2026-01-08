import { Injectable, NotFoundException, ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Tenant } from '../entities/tenant.entity';
import { UserTenant } from '../entities/user-tenant.entity';
import { User } from '../entities/user.entity';
import { UserRole } from '../entities/user-role.enum';
import { InviteUserDto, UpdateUserRoleDto } from './dto/invite-user.dto';
import { TwilioService } from '../twilio/twilio.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class TenantsService {
  // Cache for tenant lookups to reduce database queries
  private tenantCache = new Map<string, { tenant: Tenant; timestamp: number }>();
  private readonly TENANT_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

  constructor(
    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,
    @InjectRepository(UserTenant)
    private userTenantRepository: Repository<UserTenant>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private twilioService: TwilioService,
    private configService: ConfigService,
  ) {}

  async getUserTenants(userId: string): Promise<Tenant[]> {
    const userTenants = await this.userTenantRepository.find({
      where: { userId, isActive: true },
      relations: ['tenant'],
    });

    return userTenants.map((ut) => ut.tenant);
  }

  async switchTenant(userId: string, tenantId: string): Promise<void> {
    const userTenant = await this.userTenantRepository.findOne({
      where: { userId, tenantId, isActive: true },
    });

    if (!userTenant) {
      throw new ForbiddenException('User does not have access to this tenant');
    }
  }

  async getTenantById(tenantId: string): Promise<Tenant> {
    // Check cache first
    const cached = this.tenantCache.get(tenantId);
    if (cached && Date.now() - cached.timestamp < this.TENANT_CACHE_TTL) {
      return cached.tenant;
    }

    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // Update cache
    this.tenantCache.set(tenantId, { tenant, timestamp: Date.now() });
    
    // Clean up old cache entries periodically
    if (this.tenantCache.size > 500) {
      const now = Date.now();
      for (const [key, value] of this.tenantCache.entries()) {
        if (now - value.timestamp > this.TENANT_CACHE_TTL) {
          this.tenantCache.delete(key);
        }
      }
    }

    return tenant;
  }

  /**
   * Clear tenant cache for a specific tenant (useful when tenant is updated)
   */
  clearTenantCache(tenantId?: string): void {
    if (tenantId) {
      this.tenantCache.delete(tenantId);
    } else {
      this.tenantCache.clear();
    }
  }

  async updateTenant(tenantId: string, updates: Partial<Tenant>): Promise<Tenant> {
    const tenant = await this.getTenantById(tenantId);
    
    // Update allowed fields
    if (updates.name !== undefined) tenant.name = updates.name;
    if (updates.timezone !== undefined) tenant.timezone = updates.timezone;
    if (updates.legalFooterTemplate !== undefined) tenant.legalFooterTemplate = updates.legalFooterTemplate;
    if (updates.branding !== undefined) tenant.branding = { ...tenant.branding, ...updates.branding };
    if (updates.logoUrl !== undefined) tenant.logoUrl = updates.logoUrl;
    if (updates.slug !== undefined) tenant.slug = updates.slug;
    
    return this.tenantRepository.save(tenant);
  }

  /**
   * Get all team members for a tenant
   */
  async getTeamMembers(tenantId: string): Promise<Array<{
    id: string;
    userId: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    role: UserRole;
    isActive: boolean;
    createdAt: Date;
  }>> {
    const userTenants = await this.userTenantRepository.find({
      where: { tenantId },
      relations: ['user'],
      order: { createdAt: 'ASC' },
    });

    return userTenants.map((ut) => ({
      id: ut.id,
      userId: ut.userId,
      email: ut.user.email,
      firstName: ut.user.firstName,
      lastName: ut.user.lastName,
      role: ut.role,
      isActive: ut.isActive,
      createdAt: ut.createdAt,
    }));
  }

  /**
   * Invite a user to join the tenant
   */
  async inviteUser(tenantId: string, inviteDto: InviteUserDto, inviterUserId: string): Promise<{
    user: User;
    userTenant: UserTenant;
    isNewUser: boolean;
  }> {
    // Check if inviter has permission (OWNER or ADMIN)
    const inviterUserTenant = await this.userTenantRepository.findOne({
      where: { userId: inviterUserId, tenantId, isActive: true },
    });

    if (!inviterUserTenant) {
      throw new ForbiddenException('You do not have access to this tenant');
    }

    if (inviterUserTenant.role !== UserRole.OWNER && inviterUserTenant.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only owners and admins can invite users');
    }

    // Prevent inviting SUPER_ADMIN role
    if (inviteDto.role === UserRole.SUPER_ADMIN) {
      throw new BadRequestException('Cannot invite users with SUPER_ADMIN role');
    }

    // Check if user already exists
    let user = await this.userRepository.findOne({
      where: { email: inviteDto.email },
    });

    const isNewUser = !user;

    if (!user) {
      // Generate temporary password for first signin (12 characters, alphanumeric)
      const tempPassword = crypto.randomBytes(8).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 8) + 
                          crypto.randomInt(1000, 9999).toString();
      const passwordHash = await bcrypt.hash(tempPassword, 10);

      // Generate signup token (store in emailVerificationToken field)
      const signupToken = crypto.randomBytes(32).toString('hex');

      user = this.userRepository.create({
        email: inviteDto.email,
        passwordHash,
        firstName: inviteDto.firstName,
        lastName: inviteDto.lastName,
        emailVerified: false,
        emailVerificationToken: signupToken,
        isActive: true,
      });
      user = await this.userRepository.save(user);

      // Send SMS invitation with signup link and password
      try {
        await this.sendSignupSMS(tenantId, inviteDto.phoneNumber, inviteDto.email, signupToken, tempPassword);
      } catch (error) {
        // Log error but don't fail the invitation
        console.error('Failed to send signup SMS:', error);
        // Optionally, you could throw an error here if SMS is critical
      }
    }

    // Check if user is already in this tenant
    const existingUserTenant = await this.userTenantRepository.findOne({
      where: { userId: user.id, tenantId },
    });

    if (existingUserTenant) {
      if (existingUserTenant.isActive) {
        throw new ConflictException('User is already a member of this tenant');
      } else {
        // Reactivate the user tenant relationship
        existingUserTenant.isActive = true;
        existingUserTenant.role = inviteDto.role;
        const userTenant = await this.userTenantRepository.save(existingUserTenant);
        return { user, userTenant, isNewUser };
      }
    }

    // Create user-tenant relationship
    const userTenant = this.userTenantRepository.create({
      userId: user.id,
      tenantId,
      role: inviteDto.role,
      isActive: true,
    });

    await this.userTenantRepository.save(userTenant);

    return { user, userTenant, isNewUser };
  }

  /**
   * Update a user's role in the tenant
   */
  async updateUserRole(
    tenantId: string,
    userTenantId: string,
    updateDto: UpdateUserRoleDto,
    updaterUserId: string,
  ): Promise<UserTenant> {
    // Check if updater has permission (OWNER or ADMIN)
    const updaterUserTenant = await this.userTenantRepository.findOne({
      where: { userId: updaterUserId, tenantId, isActive: true },
    });

    if (!updaterUserTenant) {
      throw new ForbiddenException('You do not have access to this tenant');
    }

    if (updaterUserTenant.role !== UserRole.OWNER && updaterUserTenant.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only owners and admins can update user roles');
    }

    // Prevent setting SUPER_ADMIN role
    if (updateDto.role === UserRole.SUPER_ADMIN) {
      throw new BadRequestException('Cannot set SUPER_ADMIN role');
    }

    const userTenant = await this.userTenantRepository.findOne({
      where: { id: userTenantId, tenantId },
    });

    if (!userTenant) {
      throw new NotFoundException('User tenant relationship not found');
    }

    // Prevent users from changing their own role
    if (userTenant.userId === updaterUserId) {
      throw new BadRequestException('You cannot change your own role');
    }

    // Prevent changing OWNER role (only owners can change other roles)
    if (userTenant.role === UserRole.OWNER && updaterUserTenant.role !== UserRole.OWNER) {
      throw new ForbiddenException('Only owners can change owner roles');
    }

    userTenant.role = updateDto.role;
    return this.userTenantRepository.save(userTenant);
  }

  /**
   * Remove a user from the tenant
   */
  async removeUser(tenantId: string, userTenantId: string, removerUserId: string): Promise<void> {
    // Check if remover has permission (OWNER or ADMIN)
    const removerUserTenant = await this.userTenantRepository.findOne({
      where: { userId: removerUserId, tenantId, isActive: true },
    });

    if (!removerUserTenant) {
      throw new ForbiddenException('You do not have access to this tenant');
    }

    if (removerUserTenant.role !== UserRole.OWNER && removerUserTenant.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only owners and admins can remove users');
    }

    const userTenant = await this.userTenantRepository.findOne({
      where: { id: userTenantId, tenantId },
    });

    if (!userTenant) {
      throw new NotFoundException('User tenant relationship not found');
    }

    // Prevent users from removing themselves
    if (userTenant.userId === removerUserId) {
      throw new BadRequestException('You cannot remove yourself from the tenant');
    }

    // Prevent removing OWNER role (only owners can remove other owners)
    if (userTenant.role === UserRole.OWNER && removerUserTenant.role !== UserRole.OWNER) {
      throw new ForbiddenException('Only owners can remove other owners');
    }

    // Deactivate instead of delete to preserve history
    userTenant.isActive = false;
    await this.userTenantRepository.save(userTenant);
  }

  /**
   * Send SMS invitation with signup link and password
   */
  private async sendSignupSMS(
    tenantId: string,
    phoneNumber: string,
    email: string,
    signupToken: string,
    tempPassword: string,
  ): Promise<void> {
    // Get frontend URL from config
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5001';
    
    // Construct signup completion URL
    const signupUrl = `${frontendUrl}/complete-signup?token=${signupToken}&email=${encodeURIComponent(email)}`;
    
    // Create SMS message (keep it concise for SMS)
    const message = `You've been invited! Complete signup: ${signupUrl}\n\nTemp password: ${tempPassword}\n\nSet a new password on first login.`;
    
    // Send SMS via Twilio
    await this.twilioService.sendSMS(tenantId, phoneNumber, message);
  }
}

