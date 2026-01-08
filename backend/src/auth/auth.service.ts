import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { UserTenant } from '../entities/user-tenant.entity';
import { Tenant } from '../entities/tenant.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { CompleteSignupDto } from './dto/complete-signup.dto';
import { TenantLimitsService } from '../tenant-limits/tenant-limits.service';
import { LeadStatusesService } from '../lead-statuses/lead-statuses.service';
import { AccountLinkingService } from '../account-linking/account-linking.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserTenant)
    private userTenantRepository: Repository<UserTenant>,
    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
    private jwtService: JwtService,
    private configService: ConfigService,
    @Inject(forwardRef(() => TenantLimitsService))
    private tenantLimitsService: TenantLimitsService,
    @Inject(forwardRef(() => LeadStatusesService))
    private leadStatusesService: LeadStatusesService,
    @Inject(forwardRef(() => AccountLinkingService))
    private accountLinkingService: AccountLinkingService,
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user || !user.isActive) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  async login(loginDto: LoginDto, tenantId?: string) {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Get user's tenant if tenantId not provided
    let activeTenantId = tenantId;
    if (!activeTenantId) {
      const userTenant = await this.userTenantRepository.findOne({
        where: { userId: user.id, isActive: true },
        order: { createdAt: 'ASC' },
      });
      activeTenantId = userTenant?.tenantId;
    }

    if (!activeTenantId) {
      throw new BadRequestException('User has no active tenant');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      tenantId: activeTenantId,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = await this.createRefreshToken(user.id, activeTenantId);

    return {
      accessToken,
      refreshToken: refreshToken.token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      tenantId: activeTenantId,
    };
  }

  async signup(signupDto: SignupDto) {
    const existingUser = await this.userRepository.findOne({
      where: { email: signupDto.email },
    });
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const passwordHash = await bcrypt.hash(signupDto.password, 10);

    // Check if tenant name already exists (tenant names must be unique)
    const existingTenant = await this.tenantRepository.findOne({
      where: { name: signupDto.tenantName },
    });
    
    if (existingTenant) {
      throw new ConflictException('A workspace with this name already exists. Please choose a different workspace name.');
    }

    // Generate unique slug
    let baseSlug = signupDto.tenantName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    let slug = baseSlug;
    let counter = 1;
    
    // Ensure slug is unique (in case name is unique but slug collides)
    while (await this.tenantRepository.findOne({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
      if (counter > 100) {
        // Fallback to timestamp-based slug if too many conflicts
        slug = `${baseSlug}-${Date.now()}`;
        break;
      }
    }

    // Create tenant
    const tenant = this.tenantRepository.create({
      name: signupDto.tenantName,
      slug,
    });
    
    try {
      const savedTenant = await this.tenantRepository.save(tenant);

      // Create user
      const user = this.userRepository.create({
        email: signupDto.email,
        passwordHash,
        firstName: signupDto.firstName,
        lastName: signupDto.lastName,
        emailVerified: false, // TODO: Implement email verification
      });
      const savedUser = await this.userRepository.save(user);

      // Create user-tenant relationship with OWNER role
      const userTenant = this.userTenantRepository.create({
        userId: savedUser.id,
        tenantId: savedTenant.id,
        role: 'OWNER' as any,
      });
      await this.userTenantRepository.save(userTenant);

      // Note: Onboarding progress will be created automatically on first access
      // via the onboarding service's getOrCreateProgress method

      // Initialize demo limits for new tenant
      try {
        await this.tenantLimitsService.initializeDemoLimits(savedTenant.id);
      } catch (error) {
        // Log error but don't fail signup if limits initialization fails
        console.error('Failed to initialize demo limits:', error);
      }

      // Initialize default lead statuses for new tenant
      try {
        await this.leadStatusesService.initializeDefaultStatuses(savedTenant.id);
      } catch (error) {
        // Log error but don't fail signup if status initialization fails
        console.error('Failed to initialize default lead statuses:', error);
      }

      // Login the user
      return this.login(
        { email: signupDto.email, password: signupDto.password },
        savedTenant.id,
      );
    } catch (error: any) {
      // Handle database constraint violations
      if (error.code === '23505') { // PostgreSQL unique violation
        if (error.constraint?.includes('name') || error.message?.includes('name')) {
          throw new ConflictException('A workspace with this name already exists. Please choose a different name.');
        }
        if (error.constraint?.includes('slug') || error.message?.includes('slug')) {
          throw new ConflictException('A workspace with this name already exists. Please choose a different name.');
        }
      }
      throw error;
    }
  }

  async refreshToken(token: string) {
    if (!token) {
      throw new UnauthorizedException('Refresh token is required');
    }

    const refreshToken = await this.refreshTokenRepository.findOne({
      where: { token },
      relations: ['user'],
    });

    if (
      !refreshToken ||
      refreshToken.revoked ||
      refreshToken.expiresAt < new Date()
    ) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (!refreshToken.user) {
      throw new UnauthorizedException('User not found for refresh token');
    }

    const payload = {
      sub: refreshToken.userId,
      email: refreshToken.user.email,
      tenantId: refreshToken.tenantId,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
    };
  }

  private async createRefreshToken(
    userId: string,
    tenantId: string,
  ): Promise<RefreshToken> {
    const expiresIn = this.configService.get<string>(
      'JWT_REFRESH_EXPIRES_IN',
      '7d',
    );
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Default 7 days

    const token = this.generateRandomToken();

    const refreshToken = this.refreshTokenRepository.create({
      userId,
      tenantId,
      token,
      expiresAt,
    });

    return this.refreshTokenRepository.save(refreshToken);
  }

  async getUserProfile(userId: string): Promise<Partial<User>> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Return user profile without sensitive data
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      emailVerified: user.emailVerified,
      timezone: user.timezone,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async updateUserProfile(
    userId: string,
    updates: Partial<{ firstName: string; lastName: string; timezone: string }>,
  ): Promise<Partial<User>> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Update allowed fields
    if (updates.firstName !== undefined) {
      user.firstName = updates.firstName;
    }
    if (updates.lastName !== undefined) {
      user.lastName = updates.lastName;
    }
    if (updates.timezone !== undefined) {
      user.timezone = updates.timezone;
    }

    await this.userRepository.save(user);

    return this.getUserProfile(userId);
  }

  /**
   * Complete signup process using token from SMS invitation
   */
  async completeSignup(completeSignupDto: CompleteSignupDto) {
    const { email, token, password } = completeSignupDto;

    // Find user by email and token
    const user = await this.userRepository.findOne({
      where: { email, emailVerificationToken: token },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired signup token');
    }

    // Check if user is already verified
    if (user.emailVerified) {
      throw new BadRequestException('Account has already been activated');
    }

    // Update password
    const passwordHash = await bcrypt.hash(password, 10);
    user.passwordHash = passwordHash;
    user.emailVerified = true;
    user.emailVerificationToken = null; // Clear the token
    await this.userRepository.save(user);

    // Get user's tenant
    const userTenant = await this.userTenantRepository.findOne({
      where: { userId: user.id, isActive: true },
      order: { createdAt: 'ASC' },
    });

    if (!userTenant) {
      throw new BadRequestException('User has no active tenant');
    }

    // Login the user
    return this.login(
      { email, password },
      userTenant.tenantId,
    );
  }

  async loginFromMarketplace(marketplaceUserId: string, tenantId: string) {
    // Check if marketplace user has a linked engine account
    const engineUser = await this.accountLinkingService.getLinkedEngineUser(
      marketplaceUserId,
      tenantId,
    );

    if (!engineUser) {
      throw new NotFoundException('No linked engine account found');
    }

    if (!engineUser.isActive) {
      throw new UnauthorizedException('Linked engine account is inactive');
    }

    // Verify tenant exists and user has access
    const userTenant = await this.userTenantRepository.findOne({
      where: { userId: engineUser.id, tenantId, isActive: true },
    });

    if (!userTenant) {
      throw new UnauthorizedException('User does not have access to this tenant');
    }

    // Generate engine tokens
    const payload = {
      sub: engineUser.id,
      email: engineUser.email,
      tenantId,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = await this.createRefreshToken(engineUser.id, tenantId);

    return {
      accessToken,
      refreshToken: refreshToken.token,
      user: {
        id: engineUser.id,
        email: engineUser.email,
        firstName: engineUser.firstName,
        lastName: engineUser.lastName,
      },
      tenantId,
    };
  }

  async checkLinkedMarketplaceAccount(engineUserId: string, tenantId: string) {
    const link = await this.accountLinkingService.getAccountLink(
      engineUserId,
      undefined,
      tenantId,
    );

    if (!link) {
      return { linked: false };
    }

    return {
      linked: true,
      marketplaceUserId: link.marketplaceUserId,
    };
  }

  private generateRandomToken(): string {
    return require('crypto').randomBytes(64).toString('hex');
  }
}

