import { Injectable, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MarketplaceUser, MarketplaceUserType } from '../entities/marketplace-user.entity';
import { UserTenant } from '../../entities/user-tenant.entity';
import { UserRole } from '../../entities/user-role.enum';
import { LeadReservation } from '../entities/lead-reservation.entity';

@Injectable()
export class MarketplaceUserRegistrationService {
  private readonly logger = new Logger(MarketplaceUserRegistrationService.name);

  constructor(
    @InjectRepository(MarketplaceUser)
    private marketplaceUserRepository: Repository<MarketplaceUser>,
    @InjectRepository(UserTenant)
    private userTenantRepository: Repository<UserTenant>,
    @InjectRepository(LeadReservation)
    private leadReservationRepository: Repository<LeadReservation>,
  ) {}

  async registerAsMarketer(
    tenantId: string,
    userId: string,
    companyName: string,
    storefrontSlug?: string,
  ): Promise<MarketplaceUser> {
    // Check if user already has marketplace profile
    let marketplaceUser = await this.marketplaceUserRepository.findOne({
      where: { userId, tenantId },
    });

    if (marketplaceUser) {
      // Update existing profile
      if (marketplaceUser.userType === MarketplaceUserType.BUYER) {
        marketplaceUser.userType = MarketplaceUserType.BOTH;
      } else if (marketplaceUser.userType === MarketplaceUserType.MARKETER) {
        // Already a marketer, just update info
      }
    } else {
      // Create new marketplace user
      marketplaceUser = this.marketplaceUserRepository.create({
        tenantId,
        userId,
        userType: MarketplaceUserType.MARKETER,
        companyName,
        storefrontSlug: storefrontSlug || this.generateSlug(companyName),
        isVerified: false,
      });
    }

    // Validate storefront slug uniqueness
    if (storefrontSlug || marketplaceUser.storefrontSlug) {
      const slug = storefrontSlug || marketplaceUser.storefrontSlug;
      const existing = await this.marketplaceUserRepository.findOne({
        where: { storefrontSlug: slug, tenantId },
      });

      if (existing && existing.id !== marketplaceUser.id) {
        throw new ConflictException('Storefront slug already taken');
      }

      marketplaceUser.storefrontSlug = slug;
    }

    marketplaceUser.companyName = companyName;

    const saved = await this.marketplaceUserRepository.save(marketplaceUser);

    // Update user role if needed
    await this.updateUserRole(tenantId, userId, UserRole.MARKETER);

    this.logger.log(`User ${userId} registered as marketer in tenant ${tenantId}`);

    return saved;
  }

  async registerAsBuyer(tenantId: string, userId: string): Promise<MarketplaceUser> {
    // Check if user already has marketplace profile
    let marketplaceUser = await this.marketplaceUserRepository.findOne({
      where: { userId, tenantId },
    });

    if (marketplaceUser) {
      // Update existing profile
      if (marketplaceUser.userType === MarketplaceUserType.MARKETER) {
        marketplaceUser.userType = MarketplaceUserType.BOTH;
      } else if (marketplaceUser.userType === MarketplaceUserType.BUYER) {
        // Already a buyer
        return marketplaceUser;
      }
    } else {
      // Create new marketplace user
      marketplaceUser = this.marketplaceUserRepository.create({
        tenantId,
        userId,
        userType: MarketplaceUserType.BUYER,
        isVerified: false,
      });
    }

    const saved = await this.marketplaceUserRepository.save(marketplaceUser);

    // Create initial lead reservation balance (0)
    await this.ensureLeadReservationAccount(tenantId, userId);

    // Update user role if needed
    await this.updateUserRole(tenantId, userId, UserRole.BUYER);

    this.logger.log(`User ${userId} registered as buyer in tenant ${tenantId}`);

    return saved;
  }

  async registerAsBoth(
    tenantId: string,
    userId: string,
    companyName: string,
    storefrontSlug?: string,
  ): Promise<MarketplaceUser> {
    // Check if user already has marketplace profile
    let marketplaceUser = await this.marketplaceUserRepository.findOne({
      where: { userId, tenantId },
    });

    if (marketplaceUser) {
      marketplaceUser.userType = MarketplaceUserType.BOTH;
      marketplaceUser.companyName = companyName;
      if (storefrontSlug) {
        marketplaceUser.storefrontSlug = storefrontSlug;
      }
    } else {
      marketplaceUser = this.marketplaceUserRepository.create({
        tenantId,
        userId,
        userType: MarketplaceUserType.BOTH,
        companyName,
        storefrontSlug: storefrontSlug || this.generateSlug(companyName),
        isVerified: false,
      });
    }

    // Validate storefront slug uniqueness
    if (storefrontSlug || marketplaceUser.storefrontSlug) {
      const slug = storefrontSlug || marketplaceUser.storefrontSlug;
      const existing = await this.marketplaceUserRepository.findOne({
        where: { storefrontSlug: slug, tenantId },
      });

      if (existing && existing.id !== marketplaceUser.id) {
        throw new ConflictException('Storefront slug already taken');
      }

      marketplaceUser.storefrontSlug = slug;
    }

    const saved = await this.marketplaceUserRepository.save(marketplaceUser);

    // Create initial lead reservation balance
    await this.ensureLeadReservationAccount(tenantId, userId);

    // Update user role
    await this.updateUserRole(tenantId, userId, UserRole.MARKETER); // Marketer role includes buyer capabilities

    this.logger.log(`User ${userId} registered as both marketer and buyer in tenant ${tenantId}`);

    return saved;
  }

  async updateStorefrontSettings(
    tenantId: string,
    userId: string,
    settings: Record<string, any>,
  ): Promise<MarketplaceUser> {
    const marketplaceUser = await this.marketplaceUserRepository.findOne({
      where: { userId, tenantId },
    });

    if (!marketplaceUser) {
      throw new BadRequestException('Marketplace user profile not found');
    }

    if (
      marketplaceUser.userType !== MarketplaceUserType.MARKETER &&
      marketplaceUser.userType !== MarketplaceUserType.BOTH
    ) {
      throw new BadRequestException('Only marketers can update storefront settings');
    }

    marketplaceUser.storefrontSettings = {
      ...(marketplaceUser.storefrontSettings || {}),
      ...settings,
    };

    return this.marketplaceUserRepository.save(marketplaceUser);
  }

  async verifyMarketer(tenantId: string, userId: string): Promise<MarketplaceUser> {
    const marketplaceUser = await this.marketplaceUserRepository.findOne({
      where: { userId, tenantId },
    });

    if (!marketplaceUser) {
      throw new BadRequestException('Marketplace user profile not found');
    }

    marketplaceUser.isVerified = true;
    return this.marketplaceUserRepository.save(marketplaceUser);
  }

  private async updateUserRole(tenantId: string, userId: string, role: UserRole): Promise<void> {
    const userTenant = await this.userTenantRepository.findOne({
      where: { userId, tenantId },
    });

    if (userTenant) {
      // If user already has a higher role, don't downgrade
      const roleHierarchy: { [key in UserRole]: number } = {
        [UserRole.SUPER_ADMIN]: 10,
        [UserRole.OWNER]: 9,
        [UserRole.ADMIN]: 8,
        [UserRole.MANAGER]: 7,
        [UserRole.MARKETPLACE_ADMIN]: 6,
        [UserRole.MARKETER]: 5,
        [UserRole.BUYER]: 4,
        [UserRole.AGENT]: 3,
        [UserRole.VIEWER]: 2,
      };

      const currentRoleLevel = roleHierarchy[userTenant.role] || 0;
      const newRoleLevel = roleHierarchy[role] || 0;

      if (newRoleLevel > currentRoleLevel) {
        userTenant.role = role;
        await this.userTenantRepository.save(userTenant);
      }
    }
  }

  private async ensureLeadReservationAccount(tenantId: string, userId: string): Promise<void> {
    const existing = await this.leadReservationRepository.findOne({
      where: { tenantId, userId },
    });

    if (!existing) {
      const reservation = this.leadReservationRepository.create({
        tenantId,
        userId,
        balance: 0,
      });
      await this.leadReservationRepository.save(reservation);
    }
  }

  private generateSlug(companyName: string): string {
    return companyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50);
  }
}


