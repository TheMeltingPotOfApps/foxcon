import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import * as bcrypt from 'bcrypt';
import { Tenant } from '../entities/tenant.entity';
import { User } from '../entities/user.entity';
import { UserTenant } from '../entities/user-tenant.entity';
import { Subscription, PlanType, SubscriptionStatus } from '../entities/subscription.entity';
import { UserRole } from '../entities/user-role.enum';
import { CreateTenantDto, UpdateTenantDto, ChangeTenantPlanDto } from './dto/manage-tenant.dto';
import { CreateUserDto, UpdateUserDto, ChangeUserRoleDto, AssignUserToTenantDto } from './dto/manage-user.dto';
import { UpdatePricingDto, CreateStripePriceDto } from './dto/update-pricing.dto';
@Injectable()
export class SuperAdminManagementService {
  private readonly logger = new Logger(SuperAdminManagementService.name);
  private stripe: Stripe;

  constructor(
    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserTenant)
    private userTenantRepository: Repository<UserTenant>,
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
    private configService: ConfigService,
  ) {
    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (stripeSecretKey) {
      this.stripe = new Stripe(stripeSecretKey, {
        apiVersion: '2025-11-17.clover',
      });
    }
  }

  // ==================== PRICING MANAGEMENT ====================

  /**
   * Get current Stripe pricing configuration
   */
  async getPricingConfig(): Promise<Record<PlanType, { priceId: string; name: string; currentPrice?: number }>> {
    const config: Record<string, any> = {};
    
    for (const planType of Object.values(PlanType)) {
      const priceId = this.configService.get<string>(`STRIPE_PRICE_${planType.toUpperCase()}`);
      if (priceId && this.stripe) {
        try {
          const price = await this.stripe.prices.retrieve(priceId);
          config[planType] = {
            priceId: price.id,
            name: planType,
            currentPrice: price.unit_amount ? price.unit_amount / 100 : undefined,
            currency: price.currency,
            interval: price.recurring?.interval,
          };
        } catch (error) {
          this.logger.warn(`Failed to retrieve price for ${planType}:`, error);
          config[planType] = {
            priceId: priceId || '',
            name: planType,
          };
        }
      } else {
        config[planType] = {
          priceId: priceId || '',
          name: planType,
        };
      }
    }

    return config as Record<PlanType, { priceId: string; name: string; currentPrice?: number }>;
  }

  /**
   * Create a new Stripe price
   */
  async createStripePrice(dto: CreateStripePriceDto): Promise<{ priceId: string; productId?: string }> {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured');
    }

    // Get or create product for this plan type
    const productName = `${dto.planType.charAt(0).toUpperCase() + dto.planType.slice(1)} Plan`;
    const existingProduct = await this.stripe.products.search({
      query: `name:'${productName}' AND metadata['planType']:'${dto.planType}'`,
      limit: 1,
    });

    let productId: string;
    if (existingProduct.data.length > 0) {
      productId = existingProduct.data[0].id;
    } else {
      const product = await this.stripe.products.create({
        name: productName,
        metadata: {
          planType: dto.planType,
        },
      });
      productId = product.id;
    }

    // Create price
    const price = await this.stripe.prices.create({
      product: productId,
      unit_amount: Math.round(dto.amount * 100), // Convert to cents
      currency: dto.currency || 'usd',
      recurring: {
        interval: dto.interval,
      },
      metadata: {
        planType: dto.planType,
        billingInterval: dto.interval,
      },
    });

    return {
      priceId: price.id,
      productId,
    };
  }

  /**
   * Update Stripe price configuration in environment
   * Note: This updates the .env file, requires restart to take effect
   */
  async updatePricingConfig(dto: UpdatePricingDto): Promise<{ message: string; priceId?: string }> {
    const envKey = `STRIPE_PRICE_${dto.planType.toUpperCase()}`;
    
    // If creating new price
    if (dto.monthlyPrice && !dto.stripePriceId) {
      const priceDto: CreateStripePriceDto = {
        planType: dto.planType,
        amount: dto.monthlyPrice,
        interval: 'month',
      };
      const result = await this.createStripePrice(priceDto);
      
      return {
        message: `New price created. Add to .env: ${envKey}=${result.priceId}`,
        priceId: result.priceId,
      };
    }

    // If updating existing price ID
    if (dto.stripePriceId) {
      return {
        message: `Update .env file: ${envKey}=${dto.stripePriceId}. Restart backend to apply changes.`,
        priceId: dto.stripePriceId,
      };
    }

    throw new BadRequestException('Either stripePriceId or monthlyPrice must be provided');
  }

  // ==================== TENANT MANAGEMENT ====================

  /**
   * Create a new tenant
   */
  async createTenant(dto: CreateTenantDto): Promise<{ tenant: Tenant; owner?: UserTenant }> {
    // Check if tenant name already exists
    const existing = await this.tenantRepository.findOne({
      where: { name: dto.name },
    });

    if (existing) {
      throw new BadRequestException('Tenant with this name already exists');
    }

    // Create tenant
    const tenant = this.tenantRepository.create({
      name: dto.name,
      slug: dto.slug,
      timezone: dto.timezone,
      isActive: true,
      billing: dto.planType ? { planType: dto.planType } : undefined,
    });

    await this.tenantRepository.save(tenant);

    let owner: UserTenant | undefined;

    // Create owner user if email provided
    if (dto.ownerEmail) {
      // Check if user exists
      let user = await this.userRepository.findOne({
        where: { email: dto.ownerEmail },
      });

      if (!user && dto.ownerPassword) {
        // Create new user
        const passwordHash = await bcrypt.hash(dto.ownerPassword, 10);
        user = this.userRepository.create({
          email: dto.ownerEmail,
          passwordHash,
          isActive: true,
        });
        await this.userRepository.save(user);
      }

      if (user) {
        // Create user-tenant relationship
        owner = this.userTenantRepository.create({
          userId: user.id,
          tenantId: tenant.id,
          role: UserRole.OWNER,
          isActive: true,
        });
        await this.userTenantRepository.save(owner);
      }
    }

    return { tenant, owner };
  }

  /**
   * Update tenant
   */
  async updateTenant(tenantId: string, dto: UpdateTenantDto): Promise<Tenant> {
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    if (dto.name !== undefined) tenant.name = dto.name;
    if (dto.slug !== undefined) tenant.slug = dto.slug;
    if (dto.timezone !== undefined) tenant.timezone = dto.timezone;
    if (dto.isActive !== undefined) tenant.isActive = dto.isActive;
    if (dto.billing !== undefined) {
      tenant.billing = { ...tenant.billing, ...dto.billing };
    }

    return await this.tenantRepository.save(tenant);
  }

  /**
   * Delete tenant (soft delete by setting isActive = false)
   */
  async deleteTenant(tenantId: string): Promise<void> {
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    tenant.isActive = false;
    await this.tenantRepository.save(tenant);
  }

  /**
   * Change tenant's subscription plan
   */
  async changeTenantPlan(tenantId: string, dto: ChangeTenantPlanDto): Promise<Subscription> {
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // Get current subscription
    const subscription = await this.subscriptionRepository.findOne({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });

    if (!subscription || !subscription.stripeSubscriptionId) {
      throw new BadRequestException('Tenant does not have an active Stripe subscription');
    }

    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured');
    }

    // Get new price ID
    const newPriceId = this.configService.get<string>(`STRIPE_PRICE_${dto.planType.toUpperCase()}`);
    if (!newPriceId) {
      throw new BadRequestException(`Price ID not configured for plan: ${dto.planType}`);
    }

    // Update subscription in Stripe
    const stripeSubscription = await this.stripe.subscriptions.retrieve(subscription.stripeSubscriptionId);
    
    await this.stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      items: [{
        id: stripeSubscription.items.data[0].id,
        price: newPriceId,
      }],
      proration_behavior: dto.prorate ? 'create_prorations' : 'none',
      metadata: {
        ...stripeSubscription.metadata,
        planType: dto.planType,
      },
    });

    // Update local subscription
    subscription.planType = dto.planType;
    subscription.stripePriceId = newPriceId;
    await this.subscriptionRepository.save(subscription);

    // Update tenant billing info
    if (!tenant.billing) {
      tenant.billing = {};
    }
    tenant.billing.planType = dto.planType;
    await this.tenantRepository.save(tenant);

    return subscription;
  }

  // ==================== USER MANAGEMENT ====================

  /**
   * Create a new user
   */
  async createUser(dto: CreateUserDto): Promise<{ user: User; userTenant: UserTenant }> {
    // Check if user already exists
    const existing = await this.userRepository.findOne({
      where: { email: dto.email },
    });

    if (existing) {
      throw new BadRequestException('User with this email already exists');
    }

    // Verify tenant exists
    const tenant = await this.tenantRepository.findOne({
      where: { id: dto.tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // Create user
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = this.userRepository.create({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      isActive: true,
    });

    await this.userRepository.save(user);

    // Create user-tenant relationship
    const userTenant = this.userTenantRepository.create({
      userId: user.id,
      tenantId: dto.tenantId,
      role: dto.role || UserRole.VIEWER,
      isActive: true,
    });

    await this.userTenantRepository.save(userTenant);

    return { user, userTenant };
  }

  /**
   * Update user
   */
  async updateUser(userId: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (dto.email !== undefined) {
      // Check if email is already taken
      const existing = await this.userRepository.findOne({
        where: { email: dto.email },
      });
      if (existing && existing.id !== userId) {
        throw new BadRequestException('Email already in use');
      }
      user.email = dto.email;
    }
    if (dto.firstName !== undefined) user.firstName = dto.firstName;
    if (dto.lastName !== undefined) user.lastName = dto.lastName;
    if (dto.isActive !== undefined) user.isActive = dto.isActive;
    if (dto.timezone !== undefined) user.timezone = dto.timezone;

    return await this.userRepository.save(user);
  }

  /**
   * Delete user (soft delete)
   */
  async deleteUser(userId: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.isActive = false;
    await this.userRepository.save(user);

    // Deactivate all user-tenant relationships
    await this.userTenantRepository.update(
      { userId },
      { isActive: false },
    );
  }

  /**
   * Change user's role in a tenant
   */
  async changeUserRole(userId: string, dto: ChangeUserRoleDto): Promise<UserTenant> {
    // Prevent changing super admin role
    if (dto.role === UserRole.SUPER_ADMIN) {
      throw new BadRequestException('Cannot assign SUPER_ADMIN role via this endpoint');
    }

    const userTenant = await this.userTenantRepository.findOne({
      where: {
        userId,
        tenantId: dto.tenantId,
      },
    });

    if (!userTenant) {
      throw new NotFoundException('User-tenant relationship not found');
    }

    userTenant.role = dto.role;
    return await this.userTenantRepository.save(userTenant);
  }

  /**
   * Assign user to tenant
   */
  async assignUserToTenant(userId: string, dto: AssignUserToTenantDto): Promise<UserTenant> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const tenant = await this.tenantRepository.findOne({
      where: { id: dto.tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // Check if relationship already exists
    const existing = await this.userTenantRepository.findOne({
      where: {
        userId,
        tenantId: dto.tenantId,
      },
    });

    if (existing) {
      existing.isActive = true;
      if (dto.role) {
        existing.role = dto.role;
      }
      return await this.userTenantRepository.save(existing);
    }

    // Create new relationship
    const userTenant = this.userTenantRepository.create({
      userId,
      tenantId: dto.tenantId,
      role: dto.role || UserRole.VIEWER,
      isActive: true,
    });

    return await this.userTenantRepository.save(userTenant);
  }

  /**
   * Remove user from tenant
   */
  async removeUserFromTenant(userId: string, tenantId: string): Promise<void> {
    const userTenant = await this.userTenantRepository.findOne({
      where: {
        userId,
        tenantId,
      },
    });

    if (!userTenant) {
      throw new NotFoundException('User-tenant relationship not found');
    }

    // Prevent removing super admin
    if (userTenant.role === UserRole.SUPER_ADMIN) {
      throw new BadRequestException('Cannot remove super admin from tenant');
    }

    userTenant.isActive = false;
    await this.userTenantRepository.save(userTenant);
  }

  /**
   * Get all users across all tenants
   */
  async getAllUsers(): Promise<Array<User & { tenants: Array<{ tenantId: string; role: UserRole; isActive: boolean }> }>> {
    const users = await this.userRepository.find({
      order: { createdAt: 'DESC' },
    });

    const usersWithTenants = await Promise.all(
      users.map(async (user) => {
        const userTenants = await this.userTenantRepository.find({
          where: { userId: user.id },
          select: ['tenantId', 'role', 'isActive'],
        });

        return {
          ...user,
          tenants: userTenants.map((ut) => ({
            tenantId: ut.tenantId,
            role: ut.role,
            isActive: ut.isActive,
          })),
        };
      }),
    );

    return usersWithTenants;
  }

  /**
   * Get users for a specific tenant
   */
  async getTenantUsers(tenantId: string): Promise<Array<User & { role: UserRole; isActive: boolean }>> {
    const userTenants = await this.userTenantRepository.find({
      where: { tenantId },
      relations: ['user'],
    });

    return userTenants.map((ut) => ({
      ...ut.user,
      role: ut.role,
      isActive: ut.isActive,
    }));
  }
}

