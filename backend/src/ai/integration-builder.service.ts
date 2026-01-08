import { Injectable, Logger } from '@nestjs/common';
import { AiGenerationService } from './ai-generation.service';
import { ConfigService } from '../config/config.service';

export interface IntegrationConfig {
  name: string;
  description: string;
  serviceType: 'webhook' | 'api' | 'form' | 'zapier' | 'make' | 'hubspot' | 'salesforce' | 'custom';
  webhookUrl?: string;
  httpMethod?: 'GET' | 'POST' | 'PUT' | 'PATCH';
  headers?: Record<string, string>;
  authentication?: {
    type: 'none' | 'api_key' | 'bearer' | 'basic' | 'oauth2' | 'custom';
    config?: Record<string, any>;
  };
  parameterMappings?: Array<{
    sourceField: string; // e.g., 'contact.phoneNumber', 'contact.email'
    targetField: string; // Field name in the webhook payload
    required: boolean;
    defaultValue?: any;
    transform?: string; // Transformation function or template
  }>;
  bodyTemplate?: string; // JSON template with variables
  queryParams?: Record<string, string>;
  responseHandling?: {
    successField?: string; // Field in response that indicates success
    errorField?: string; // Field in response that contains error message
    extractFields?: string[]; // Fields to extract from response and store
  };
  retryConfig?: {
    maxRetries?: number;
    retryDelay?: number;
    retryOnStatusCodes?: number[];
  };
  rateLimiting?: {
    requestsPerMinute?: number;
    requestsPerHour?: number;
  };
}

@Injectable()
export class IntegrationBuilderService {
  private readonly logger = new Logger(IntegrationBuilderService.name);

  constructor(
    private readonly aiGenerationService: AiGenerationService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Generate integration configuration using AI based on user description
   */
  async generateIntegrationConfig(
    description: string,
    integrationType: 'lead_ingestion' | 'webhook',
    context?: {
      contactFields?: string[];
      journeyData?: any;
      existingIntegrations?: string[];
    },
  ): Promise<IntegrationConfig> {
    const prompt = this.buildIntegrationPrompt(description, integrationType, context);

    try {
      const response = await this.aiGenerationService.generateWithClaude(prompt);
      return this.parseIntegrationConfig(response);
    } catch (error: any) {
      this.logger.error(`Failed to generate integration config: ${error.message}`, error.stack);
      throw new Error(`Failed to generate integration configuration: ${error.message}`);
    }
  }

  /**
   * Generate integration configuration for a specific service
   */
  async generateServiceIntegration(
    serviceName: string,
    integrationType: 'lead_ingestion' | 'webhook',
    options?: {
      apiKey?: string;
      webhookUrl?: string;
      customFields?: Record<string, any>;
    },
  ): Promise<IntegrationConfig> {
    const serviceTemplates = this.getServiceTemplates();
    const template = serviceTemplates[serviceName.toLowerCase()];

    if (template) {
      return this.applyServiceTemplate(template, options);
    }

    // Use AI to generate for unknown services
    const description = `Integrate with ${serviceName} for ${integrationType}`;
    return this.generateIntegrationConfig(description, integrationType);
  }

  /**
   * Validate and enhance integration configuration
   */
  async enhanceIntegrationConfig(
    config: IntegrationConfig,
    testPayload?: Record<string, any>,
  ): Promise<IntegrationConfig> {
    // Use AI to validate and suggest improvements
    const prompt = `You are an expert at webhook and API integrations. Review this integration configuration and suggest improvements:

${JSON.stringify(config, null, 2)}

${testPayload ? `Test payload received:\n${JSON.stringify(testPayload, null, 2)}` : ''}

Provide an improved configuration with:
1. Better parameter mappings
2. Proper authentication setup
3. Error handling
4. Response parsing
5. Retry logic

Return only valid JSON matching the IntegrationConfig interface.`;

    try {
      const response = await this.aiGenerationService.generateWithClaude(prompt);
      return this.parseIntegrationConfig(response);
    } catch (error: any) {
      this.logger.warn(`Failed to enhance config, using original: ${error.message}`);
      return config;
    }
  }

  private buildIntegrationPrompt(
    description: string,
    integrationType: 'lead_ingestion' | 'webhook',
    context?: any,
  ): string {
    const basePrompt = `You are an expert at building webhook and API integrations. A user wants to ${integrationType === 'lead_ingestion' ? 'set up lead ingestion' : 'execute a webhook'} with the following description:

"${description}"

${context?.contactFields ? `Available contact fields: ${context.contactFields.join(', ')}` : ''}
${context?.existingIntegrations ? `Existing integrations: ${context.existingIntegrations.join(', ')}` : ''}

Generate a comprehensive integration configuration that includes:

1. **Service Identification**: Determine what service/platform this is (Zapier, Make, HubSpot, Salesforce, custom webhook, etc.)
2. **HTTP Configuration**: Appropriate HTTP method, URL structure, headers
3. **Authentication**: Best authentication method (API key, Bearer token, OAuth2, etc.)
4. **Parameter Mapping**: Map contact/journey fields to webhook payload fields
5. **Body Template**: JSON template with proper variable substitution
6. **Error Handling**: How to handle errors and retries
7. **Response Handling**: How to parse and use response data

For lead ingestion:
- Map incoming webhook parameters to contact fields
- Define actions (create contact, enroll in journey, add to campaign)
- Handle validation and deduplication

For webhook execution:
- Map contact/journey data to webhook payload
- Handle authentication and headers
- Define retry logic and error handling

Return ONLY valid JSON matching this structure:
{
  "name": "Integration name",
  "description": "What this integration does",
  "serviceType": "webhook|api|zapier|make|hubspot|salesforce|custom",
  "webhookUrl": "https://example.com/webhook",
  "httpMethod": "POST",
  "headers": {"Content-Type": "application/json"},
  "authentication": {
    "type": "api_key|bearer|oauth2|none",
    "config": {}
  },
  "parameterMappings": [
    {
      "sourceField": "contact.phoneNumber",
      "targetField": "phone",
      "required": true
    }
  ],
  "bodyTemplate": "{\\"phone\\": \"{{contact.phoneNumber}}\", \"email\": \"{{contact.email}}\"}",
  "responseHandling": {
    "successField": "success",
    "errorField": "error"
  },
  "retryConfig": {
    "maxRetries": 3,
    "retryDelay": 1000
  }
}`;

    return basePrompt;
  }

  private parseIntegrationConfig(response: string): IntegrationConfig {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      const jsonText = jsonMatch ? jsonMatch[1] : response;
      const config = JSON.parse(jsonText);

      // Validate and set defaults
      return {
        name: config.name || 'Generated Integration',
        description: config.description || '',
        serviceType: config.serviceType || 'webhook',
        webhookUrl: config.webhookUrl,
        httpMethod: config.httpMethod || 'POST',
        headers: config.headers || { 'Content-Type': 'application/json' },
        authentication: config.authentication || { type: 'none' },
        parameterMappings: config.parameterMappings || [],
        bodyTemplate: config.bodyTemplate || '{}',
        queryParams: config.queryParams,
        responseHandling: config.responseHandling,
        retryConfig: config.retryConfig || { maxRetries: 3, retryDelay: 1000 },
        rateLimiting: config.rateLimiting,
      };
    } catch (error: any) {
      this.logger.error(`Failed to parse integration config: ${error.message}`);
      // Return default config
      return {
        name: 'Generated Integration',
        description: 'AI-generated integration configuration',
        serviceType: 'webhook',
        httpMethod: 'POST',
        headers: { 'Content-Type': 'application/json' },
        authentication: { type: 'none' },
        parameterMappings: [],
        bodyTemplate: '{}',
        retryConfig: { maxRetries: 3, retryDelay: 1000 },
      };
    }
  }

  private getServiceTemplates(): Record<string, Partial<IntegrationConfig>> {
    return {
      zapier: {
        name: 'Zapier Webhook',
        serviceType: 'zapier',
        httpMethod: 'POST',
        headers: { 'Content-Type': 'application/json' },
        authentication: { type: 'none' },
        bodyTemplate: JSON.stringify({
          phone: '{{contact.phoneNumber}}',
          email: '{{contact.email}}',
          firstName: '{{contact.firstName}}',
          lastName: '{{contact.lastName}}',
        }),
      },
      make: {
        name: 'Make.com Webhook',
        serviceType: 'make',
        httpMethod: 'POST',
        headers: { 'Content-Type': 'application/json' },
        authentication: { type: 'none' },
        bodyTemplate: JSON.stringify({
          phone: '{{contact.phoneNumber}}',
          email: '{{contact.email}}',
        }),
      },
      hubspot: {
        name: 'HubSpot Integration',
        serviceType: 'hubspot',
        httpMethod: 'POST',
        headers: { 'Content-Type': 'application/json' },
        authentication: {
          type: 'bearer',
          config: { tokenField: 'access_token' },
        },
        webhookUrl: 'https://api.hubapi.com/crm/v3/objects/contacts',
        bodyTemplate: JSON.stringify({
          properties: {
            phone: '{{contact.phoneNumber}}',
            email: '{{contact.email}}',
            firstname: '{{contact.firstName}}',
            lastname: '{{contact.lastName}}',
          },
        }),
      },
      salesforce: {
        name: 'Salesforce Integration',
        serviceType: 'salesforce',
        httpMethod: 'POST',
        headers: { 'Content-Type': 'application/json' },
        authentication: {
          type: 'bearer',
          config: { tokenField: 'access_token' },
        },
        webhookUrl: 'https://yourinstance.salesforce.com/services/data/v57.0/sobjects/Lead',
        bodyTemplate: JSON.stringify({
          Phone: '{{contact.phoneNumber}}',
          Email: '{{contact.email}}',
          FirstName: '{{contact.firstName}}',
          LastName: '{{contact.lastName}}',
        }),
      },
    };
  }

  private applyServiceTemplate(
    template: Partial<IntegrationConfig>,
    options?: any,
  ): IntegrationConfig {
    const config = { ...template } as IntegrationConfig;

    if (options?.apiKey && config.authentication?.type === 'api_key') {
      config.authentication.config = { apiKey: options.apiKey };
    }

    if (options?.webhookUrl) {
      config.webhookUrl = options.webhookUrl;
    }

    if (options?.customFields) {
      // Merge custom fields into body template
      const body = JSON.parse(config.bodyTemplate || '{}');
      Object.assign(body, options.customFields);
      config.bodyTemplate = JSON.stringify(body);
    }

    return config as IntegrationConfig;
  }
}

