import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MarketingPlatformIntegration, MarketingPlatform } from '../entities/marketing-platform-integration.entity';
import { Listing } from '../entities/listing.entity';
import * as crypto from 'crypto';

@Injectable()
export class MarketingIntegrationService {
  private readonly logger = new Logger(MarketingIntegrationService.name);

  constructor(
    @InjectRepository(MarketingPlatformIntegration)
    private integrationRepository: Repository<MarketingPlatformIntegration>,
    @InjectRepository(Listing)
    private listingRepository: Repository<Listing>,
  ) {}

  async create(
    tenantId: string,
    marketerId: string,
    platform: MarketingPlatform,
    accessToken: string,
    refreshToken?: string,
    platformAccountId?: string,
    metadata?: Record<string, any>,
  ): Promise<MarketingPlatformIntegration> {
    // Encrypt tokens (in production, use proper encryption)
    const encryptedAccessToken = this.encryptToken(accessToken);
    const encryptedRefreshToken = refreshToken ? this.encryptToken(refreshToken) : null;

    const integration = this.integrationRepository.create({
      tenantId,
      marketerId,
      platform,
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      platformAccountId,
      metadata,
      isActive: true,
      lastSyncedAt: new Date(),
    });

    const saved = await this.integrationRepository.save(integration);

    // Update listings to verified if they use this integration
    await this.updateListingVerificationStatus(tenantId, marketerId);

    return saved;
  }

  async findAll(tenantId: string, marketerId?: string): Promise<MarketingPlatformIntegration[]> {
    const where: any = { tenantId, isActive: true };

    if (marketerId) {
      where.marketerId = marketerId;
    }

    return this.integrationRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(tenantId: string, integrationId: string): Promise<MarketingPlatformIntegration> {
    const integration = await this.integrationRepository.findOne({
      where: { id: integrationId, tenantId },
    });

    if (!integration) {
      throw new NotFoundException('Integration not found');
    }

    return integration;
  }

  async disconnect(tenantId: string, integrationId: string, marketerId: string): Promise<void> {
    const integration = await this.findOne(tenantId, integrationId);

    if (integration.marketerId !== marketerId) {
      throw new NotFoundException('Integration not found');
    }

    integration.isActive = false;
    await this.integrationRepository.save(integration);

    // Update listings verification status
    await this.updateListingVerificationStatus(tenantId, marketerId);
  }

  private async updateListingVerificationStatus(tenantId: string, marketerId: string): Promise<void> {
    // Check if marketer has any active integrations
    const integrations = await this.integrationRepository.find({
      where: { tenantId, marketerId, isActive: true },
    });

    const hasVerifiedIntegration = integrations.length > 0;

    // Update all listings for this marketer
    await this.listingRepository.update(
      { tenantId, marketerId },
      { isVerified: hasVerifiedIntegration },
    );
  }

  private encryptToken(token: string): string {
    // In production, use proper encryption with a secret key from environment
    // For now, simple base64 encoding (NOT SECURE - replace with proper encryption)
    const secret = process.env.ENCRYPTION_SECRET || 'default-secret-key-change-in-production';
    const cipher = crypto.createCipher('aes-256-cbc', secret);
    let encrypted = cipher.update(token, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  private decryptToken(encryptedToken: string): string {
    const secret = process.env.ENCRYPTION_SECRET || 'default-secret-key-change-in-production';
    const decipher = crypto.createDecipher('aes-256-cbc', secret);
    let decrypted = decipher.update(encryptedToken, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}

