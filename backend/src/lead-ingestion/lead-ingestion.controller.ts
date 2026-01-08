import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  Headers,
  Ip,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { LeadIngestionService } from './lead-ingestion.service';
import { CreateIngestionEndpointDto } from './dto/create-ingestion-endpoint.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { IntegrationBuilderService } from '../ai/integration-builder.service';

@Controller('lead-ingestion')
export class LeadIngestionController {
  constructor(
    private readonly ingestionService: LeadIngestionService,
    private readonly integrationBuilderService: IntegrationBuilderService,
  ) {}

  @Post('generate-with-ai')
  @UseGuards(JwtAuthGuard, TenantGuard)
  async generateWithAi(
    @TenantId() tenantId: string,
    @Body()
    body: {
      description: string;
      context?: {
        contactFields?: string[];
        existingIntegrations?: string[];
      };
    },
  ) {
    const config = await this.integrationBuilderService.generateIntegrationConfig(
      body.description,
      'lead_ingestion',
      body.context,
    );

    // Convert IntegrationConfig to CreateIngestionEndpointDto format
    const dto: Partial<CreateIngestionEndpointDto> = {
      name: config.name,
      description: config.description,
      endpointKey: config.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
      parameterMappings: config.parameterMappings?.map((m) => ({
        paramName: m.targetField,
        contactField: m.sourceField.replace('contact.', ''),
        required: m.required || false,
        defaultValue: m.defaultValue,
      })) || [],
      actions: [
        {
          type: 'CREATE_CONTACT' as any,
          config: {},
        },
      ],
      metadata: {
        rateLimit: config.rateLimiting,
      },
    };

    return {
      config,
      dto,
      webhookUrl: `${process.env.API_BASE_URL || 'https://api.nurtureengine.net'}/api/ingest/${dto.endpointKey}`,
    };
  }

  @Post()
  @UseGuards(JwtAuthGuard, TenantGuard)
  create(@TenantId() tenantId: string, @Body() dto: CreateIngestionEndpointDto) {
    return this.ingestionService.create(tenantId, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, TenantGuard)
  findAll(@TenantId() tenantId: string) {
    return this.ingestionService.findAll(tenantId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, TenantGuard)
  findOne(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.ingestionService.findOne(tenantId, id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, TenantGuard)
  update(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<CreateIngestionEndpointDto>,
  ) {
    return this.ingestionService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, TenantGuard)
  delete(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.ingestionService.delete(tenantId, id);
  }
}

// Public endpoint for lead ingestion (no auth required, uses API key)
@Controller('ingest')
export class PublicIngestionController {
  private readonly logger = new Logger(PublicIngestionController.name);

  constructor(private readonly ingestionService: LeadIngestionService) {}

  @Post(':endpointKey')
  @HttpCode(HttpStatus.OK)
  async ingest(
    @Param('endpointKey') endpointKey: string,
    @Body() body: Record<string, any>,
    @Query() query: Record<string, any>,
    @Headers('x-api-key') apiKey?: string,
    @Ip() clientIp?: string,
  ) {
    // Merge query params and body (body takes precedence)
    const data = { ...query, ...body };
    
    this.logger.log(
      `Lead ingestion request: endpointKey=${endpointKey}, ip=${clientIp}, hasApiKey=${!!apiKey}, params=${JSON.stringify(Object.keys(data))}`,
    );

    try {
      const result = await this.ingestionService.ingestLead(endpointKey, data, apiKey, clientIp);
      this.logger.log(
        `Lead ingested successfully: endpointKey=${endpointKey}, contactId=${result.contactId}`,
      );
      return result;
    } catch (error: any) {
      this.logger.error(
        `Lead ingestion failed: endpointKey=${endpointKey}, error=${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  // Also support GET requests for simple webhook integrations
  @Get(':endpointKey')
  @HttpCode(HttpStatus.OK)
  async ingestGet(
    @Param('endpointKey') endpointKey: string,
    @Query() query: Record<string, any>,
    @Headers('x-api-key') apiKey?: string,
    @Ip() clientIp?: string,
  ) {
    this.logger.log(
      `Lead ingestion GET request: endpointKey=${endpointKey}, ip=${clientIp}, hasApiKey=${!!apiKey}`,
    );

    try {
      const result = await this.ingestionService.ingestLead(endpointKey, query, apiKey, clientIp);
      this.logger.log(
        `Lead ingested successfully (GET): endpointKey=${endpointKey}, contactId=${result.contactId}`,
      );
      return result;
    } catch (error: any) {
      this.logger.error(
        `Lead ingestion failed (GET): endpointKey=${endpointKey}, error=${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}

