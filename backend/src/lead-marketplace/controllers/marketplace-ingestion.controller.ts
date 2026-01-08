import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  Headers,
  Ip,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { MarketplaceCustomEndpoint } from '../entities/custom-endpoint.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LeadDistributionService } from '../services/lead-distribution.service';
import { TenantId } from '../../common/decorators/tenant-id.decorator';

@Controller('ingest/nurture-leads')
export class MarketplaceIngestionController {
  private readonly logger = new Logger(MarketplaceIngestionController.name);

  constructor(
    @InjectRepository(MarketplaceCustomEndpoint)
    private endpointRepository: Repository<MarketplaceCustomEndpoint>,
    private leadDistributionService: LeadDistributionService,
  ) {}

  @Post(':endpointKey')
  @HttpCode(HttpStatus.OK)
  async ingest(
    @Param('endpointKey') endpointKey: string,
    @Body() body: Record<string, any>,
    @Query() query: Record<string, any>,
    @Headers('x-api-key') apiKey?: string,
    @Ip() clientIp?: string,
  ) {
    // Find marketplace endpoint
    const endpoint = await this.endpointRepository.findOne({
      where: { endpointKey, isActive: true },
      relations: ['listing'],
    });

    // #region agent log
    const fs5 = require('fs'); const logPath5 = '/root/SMS/.cursor/debug.log'; const logEntry5 = JSON.stringify({location:'marketplace-ingestion.controller.ts:46',message:'Endpoint lookup result',data:{endpointFound:!!endpoint,endpointKey,hasTenantId:!!endpoint?.tenantId,hasListingId:!!endpoint?.listingId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})+'\n'; fs5.appendFileSync(logPath5,logEntry5);
    // #endregion

    if (!endpoint) {
      throw new BadRequestException('Marketplace endpoint not found or inactive');
    }

    // Verify API key
    if (endpoint.apiKey !== apiKey) {
      throw new UnauthorizedException('Invalid API key');
    }

    // Merge query params and body
    const data = { ...query, ...body };

    // Map parameters according to endpoint configuration
    const contactData: any = {};
    const metadata: any = {};

    for (const mapping of endpoint.parameterMappings) {
      const value = data[mapping.paramName] ?? mapping.defaultValue;

      if (mapping.required && (value === undefined || value === null || value === '')) {
        throw new BadRequestException(`Required parameter '${mapping.paramName}' is missing`);
      }

      if (value !== undefined && value !== null && value !== '') {
        if (mapping.contactField.startsWith('metadata.')) {
          const metaKey = mapping.contactField.replace('metadata.', '');
          metadata[metaKey] = value;
        } else {
          contactData[mapping.contactField] = value;
        }
      }
    }

    // Distribute lead asynchronously via RabbitMQ
    await this.leadDistributionService.distributeLeadAsync(
      endpoint.tenantId,
      endpoint.listingId,
      contactData,
      metadata,
    );

    return {
      success: true,
      message: 'Lead queued for distribution',
    };
  }

  @Get(':endpointKey')
  @HttpCode(HttpStatus.OK)
  async ingestGet(
    @Param('endpointKey') endpointKey: string,
    @Query() query: Record<string, any>,
    @Headers('x-api-key') apiKey?: string,
    @Ip() clientIp?: string,
  ) {
    return this.ingest(endpointKey, {}, query, apiKey, clientIp);
  }
}

