import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MarketplaceCustomEndpoint } from '../entities/custom-endpoint.entity';
import { Listing } from '../entities/listing.entity';
import * as crypto from 'crypto';

@Injectable()
export class CustomEndpointService {
  private readonly logger = new Logger(CustomEndpointService.name);

  constructor(
    @InjectRepository(MarketplaceCustomEndpoint)
    private endpointRepository: Repository<MarketplaceCustomEndpoint>,
    @InjectRepository(Listing)
    private listingRepository: Repository<Listing>,
  ) {}

  async create(
    tenantId: string,
    marketerId: string,
    listingId: string,
    parameterMappings: Array<{
      paramName: string;
      contactField: string;
      required?: boolean;
      defaultValue?: any;
    }>,
  ): Promise<MarketplaceCustomEndpoint> {
    // Verify listing exists and belongs to marketer
    const listing = await this.listingRepository.findOne({
      where: { id: listingId, tenantId, marketerId },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found or you do not have permission');
    }

    // Generate unique endpoint key
    const endpointKey = this.generateEndpointKey(tenantId, listingId);

    // Generate API key
    const apiKey = this.generateApiKey();

    const endpoint = this.endpointRepository.create({
      tenantId,
      marketerId,
      listingId,
      endpointKey,
      apiKey,
      parameterMappings,
      isActive: true,
    });

    return this.endpointRepository.save(endpoint);
  }

  async findAll(tenantId: string, marketerId?: string, listingId?: string): Promise<MarketplaceCustomEndpoint[]> {
    const where: any = { tenantId };

    if (marketerId) {
      where.marketerId = marketerId;
    }

    if (listingId) {
      where.listingId = listingId;
    }

    return this.endpointRepository.find({
      where,
      relations: ['listing'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(tenantId: string, endpointId: string): Promise<MarketplaceCustomEndpoint> {
    const endpoint = await this.endpointRepository.findOne({
      where: { id: endpointId, tenantId },
      relations: ['listing'],
    });

    if (!endpoint) {
      throw new NotFoundException('Endpoint not found');
    }

    return endpoint;
  }

  async findByKey(endpointKey: string): Promise<MarketplaceCustomEndpoint | null> {
    return this.endpointRepository.findOne({
      where: { endpointKey, isActive: true },
      relations: ['listing'],
    });
  }

  async update(
    tenantId: string,
    endpointId: string,
    marketerId: string,
    data: Partial<MarketplaceCustomEndpoint>,
  ): Promise<MarketplaceCustomEndpoint> {
    const endpoint = await this.findOne(tenantId, endpointId);

    if (endpoint.marketerId !== marketerId) {
      throw new BadRequestException('You do not have permission to update this endpoint');
    }

    Object.assign(endpoint, data);
    return this.endpointRepository.save(endpoint);
  }

  async regenerateApiKey(tenantId: string, endpointId: string, marketerId: string): Promise<string> {
    const endpoint = await this.findOne(tenantId, endpointId);

    if (endpoint.marketerId !== marketerId) {
      throw new BadRequestException('You do not have permission to regenerate API key');
    }

    endpoint.apiKey = this.generateApiKey();
    await this.endpointRepository.save(endpoint);

    return endpoint.apiKey;
  }

  async delete(tenantId: string, endpointId: string, marketerId: string): Promise<void> {
    const endpoint = await this.findOne(tenantId, endpointId);

    if (endpoint.marketerId !== marketerId) {
      throw new BadRequestException('You do not have permission to delete this endpoint');
    }

    await this.endpointRepository.remove(endpoint);
  }

  private generateEndpointKey(tenantId: string, listingId: string): string {
    const random = crypto.randomBytes(8).toString('hex');
    return `mkp-${tenantId.substring(0, 8)}-${listingId.substring(0, 8)}-${random}`;
  }

  private generateApiKey(): string {
    return `mkp_${crypto.randomBytes(32).toString('hex')}`;
  }
}

