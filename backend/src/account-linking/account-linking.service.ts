import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccountLink, LinkType } from './entities/account-link.entity';
import { DataSharingPermission, ResourceType, SharingDirection } from './entities/data-sharing-permission.entity';
import { User } from '../entities/user.entity';
import { MarketplaceUser } from '../marketplace-auth/entities/marketplace-user.entity';
import { Tenant } from '../entities/tenant.entity';

@Injectable()
export class AccountLinkingService {
  private readonly logger = new Logger(AccountLinkingService.name);

  constructor(
    @InjectRepository(AccountLink)
    private readonly accountLinkRepository: Repository<AccountLink>,
    @InjectRepository(DataSharingPermission)
    private readonly permissionRepository: Repository<DataSharingPermission>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(MarketplaceUser)
    private readonly marketplaceUserRepository: Repository<MarketplaceUser>,
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
  ) {}

  async linkAccounts(
    engineUserId: string,
    marketplaceUserId: string,
    engineTenantId: string,
    linkType: LinkType = LinkType.MANUAL,
    linkedBy?: string,
  ): Promise<AccountLink> {
    // Verify users exist
    const engineUser = await this.userRepository.findOne({
      where: { id: engineUserId },
    });

    if (!engineUser) {
      throw new NotFoundException('Engine user not found');
    }

    const marketplaceUser = await this.marketplaceUserRepository.findOne({
      where: { id: marketplaceUserId },
    });

    if (!marketplaceUser) {
      throw new NotFoundException('Marketplace user not found');
    }

    // Verify tenant exists
    const tenant = await this.tenantRepository.findOne({
      where: { id: engineTenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // Check if link already exists
    const existingLink = await this.accountLinkRepository.findOne({
      where: [
        { engineUserId, marketplaceUserId },
        { engineUserId, engineTenantId },
      ],
    });

    if (existingLink) {
      if (existingLink.isActive) {
        throw new ConflictException('Accounts are already linked');
      } else {
        // Reactivate existing link
        existingLink.isActive = true;
        existingLink.linkType = linkType;
        existingLink.linkedBy = linkedBy;
        existingLink.linkedAt = new Date();
        return await this.accountLinkRepository.save(existingLink);
      }
    }

    // Create account link
    const accountLink = this.accountLinkRepository.create({
      engineUserId,
      marketplaceUserId,
      engineTenantId,
      linkType,
      linkedBy,
      isActive: true,
    });

    const savedLink = await this.accountLinkRepository.save(accountLink);

    // Create default data sharing permissions
    await this.createDefaultPermissions(savedLink.id);

    this.logger.log(
      `Accounts linked: Engine User ${engineUserId} <-> Marketplace User ${marketplaceUserId}`,
    );

    return savedLink;
  }

  async unlinkAccounts(accountLinkId: string): Promise<void> {
    const link = await this.accountLinkRepository.findOne({
      where: { id: accountLinkId },
    });

    if (!link) {
      throw new NotFoundException('Account link not found');
    }

    link.isActive = false;
    await this.accountLinkRepository.save(link);

    this.logger.log(`Account link deactivated: ${accountLinkId}`);
  }

  async getAccountLink(
    engineUserId?: string,
    marketplaceUserId?: string,
    engineTenantId?: string,
  ): Promise<AccountLink | null> {
    if (!engineUserId && !marketplaceUserId) {
      throw new BadRequestException('Either engineUserId or marketplaceUserId must be provided');
    }

    const where: any = { isActive: true };

    if (engineUserId) {
      where.engineUserId = engineUserId;
    }

    if (marketplaceUserId) {
      where.marketplaceUserId = marketplaceUserId;
    }

    if (engineTenantId) {
      where.engineTenantId = engineTenantId;
    }

    return await this.accountLinkRepository.findOne({
      where,
      relations: ['engineUser', 'marketplaceUser', 'engineTenant', 'dataSharingPermissions'],
    });
  }

  async getLinkedEngineUser(marketplaceUserId: string, tenantId?: string): Promise<User | null> {
    const where: any = {
      marketplaceUserId,
      isActive: true,
    };

    if (tenantId) {
      where.engineTenantId = tenantId;
    }

    const link = await this.accountLinkRepository.findOne({
      where,
      relations: ['engineUser'],
    });

    return link?.engineUser || null;
  }

  async getLinkedMarketplaceUser(engineUserId: string, tenantId?: string): Promise<MarketplaceUser | null> {
    const where: any = {
      engineUserId,
      isActive: true,
    };

    if (tenantId) {
      where.engineTenantId = tenantId;
    }

    const link = await this.accountLinkRepository.findOne({
      where,
      relations: ['marketplaceUser'],
    });

    return link?.marketplaceUser || null;
  }

  async updateDataSharingPermissions(
    accountLinkId: string,
    permissions: {
      resourceType: ResourceType;
      canRead: boolean;
      canWrite: boolean;
      canDelete: boolean;
      sharingDirection: SharingDirection;
    }[],
  ): Promise<DataSharingPermission[]> {
    const link = await this.accountLinkRepository.findOne({
      where: { id: accountLinkId },
    });

    if (!link) {
      throw new NotFoundException('Account link not found');
    }

    const savedPermissions: DataSharingPermission[] = [];

    for (const perm of permissions) {
      let permission = await this.permissionRepository.findOne({
        where: {
          accountLinkId,
          resourceType: perm.resourceType,
        },
      });

      if (permission) {
        permission.canRead = perm.canRead;
        permission.canWrite = perm.canWrite;
        permission.canDelete = perm.canDelete;
        permission.sharingDirection = perm.sharingDirection;
      } else {
        permission = this.permissionRepository.create({
          accountLinkId,
          ...perm,
        });
      }

      savedPermissions.push(await this.permissionRepository.save(permission));
    }

    return savedPermissions;
  }

  async getDataSharingPermissions(accountLinkId: string): Promise<DataSharingPermission[]> {
    return await this.permissionRepository.find({
      where: { accountLinkId },
    });
  }

  private async createDefaultPermissions(accountLinkId: string): Promise<void> {
    const defaultPermissions = [
      {
        resourceType: ResourceType.CONTACTS,
        canRead: true,
        canWrite: true,
        canDelete: false,
        sharingDirection: SharingDirection.BIDIRECTIONAL,
      },
      {
        resourceType: ResourceType.CAMPAIGNS,
        canRead: true,
        canWrite: false,
        canDelete: false,
        sharingDirection: SharingDirection.ENGINE_TO_MARKETPLACE,
      },
    ];

    for (const perm of defaultPermissions) {
      const permission = this.permissionRepository.create({
        accountLinkId,
        ...perm,
      });
      await this.permissionRepository.save(permission);
    }
  }
}

