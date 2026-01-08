import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Param,
  ParseEnumPipe,
} from '@nestjs/common';
import { IntegrationBuilderService, IntegrationConfig } from './integration-builder.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';

@Controller('ai/integrations')
@UseGuards(JwtAuthGuard, TenantGuard)
export class IntegrationBuilderController {
  constructor(private readonly integrationBuilderService: IntegrationBuilderService) {}

  @Post('generate')
  async generateIntegration(
    @TenantId() tenantId: string,
    @Body()
    body: {
      description: string;
      integrationType: 'lead_ingestion' | 'webhook';
      context?: {
        contactFields?: string[];
        journeyData?: any;
        existingIntegrations?: string[];
      };
    },
  ): Promise<IntegrationConfig> {
    return this.integrationBuilderService.generateIntegrationConfig(
      body.description,
      body.integrationType,
      body.context,
    );
  }

  @Post('generate-service/:serviceName')
  async generateServiceIntegration(
    @TenantId() tenantId: string,
    @Param('serviceName') serviceName: string,
    @Body()
    body: {
      integrationType: 'lead_ingestion' | 'webhook';
      options?: {
        apiKey?: string;
        webhookUrl?: string;
        customFields?: Record<string, any>;
      };
    },
  ): Promise<IntegrationConfig> {
    return this.integrationBuilderService.generateServiceIntegration(
      serviceName,
      body.integrationType,
      body.options,
    );
  }

  @Post('enhance')
  async enhanceIntegration(
    @TenantId() tenantId: string,
    @Body()
    body: {
      config: IntegrationConfig;
      testPayload?: Record<string, any>;
    },
  ): Promise<IntegrationConfig> {
    return this.integrationBuilderService.enhanceIntegrationConfig(
      body.config,
      body.testPayload,
    );
  }

  @Get('services')
  async getSupportedServices(): Promise<string[]> {
    return [
      'zapier',
      'make',
      'hubspot',
      'salesforce',
      'pipedrive',
      'activecampaign',
      'mailchimp',
      'google-sheets',
      'airtable',
      'notion',
      'slack',
      'discord',
      'custom',
    ];
  }
}

