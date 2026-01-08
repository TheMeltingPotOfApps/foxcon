import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrmIntegration, CrmProvider, CrmIntegrationType, SyncDirection } from '../entities/crm-integration.entity';
import { AccountLinkingService } from '../account-linking/account-linking.service';
import * as crypto from 'crypto';
import axios, { AxiosRequestConfig } from 'axios';

export interface CreateCrmIntegrationDto {
  provider: CrmProvider;
  name?: string;
  apiKey?: string;
  accessToken?: string;
  refreshToken?: string;
  apiUrl?: string;
  accountId?: string;
  syncDirection?: SyncDirection;
  fieldMappings?: CrmIntegration['fieldMappings'];
  syncSettings?: CrmIntegration['syncSettings'];
  oauthConfig?: CrmIntegration['oauthConfig'];
  syncToLinkedAccount?: boolean;
  metadata?: Record<string, any>;
}

export interface UpdateCrmIntegrationDto {
  name?: string;
  apiKey?: string;
  accessToken?: string;
  refreshToken?: string;
  apiUrl?: string;
  accountId?: string;
  isActive?: boolean;
  syncDirection?: SyncDirection;
  fieldMappings?: CrmIntegration['fieldMappings'];
  syncSettings?: CrmIntegration['syncSettings'];
  oauthConfig?: CrmIntegration['oauthConfig'];
  syncToLinkedAccount?: boolean;
  metadata?: Record<string, any>;
}

@Injectable()
export class CrmIntegrationsService {
  private readonly logger = new Logger(CrmIntegrationsService.name);
  private readonly encryptionSecret = process.env.ENCRYPTION_SECRET || 'default-secret-key-change-in-production';

  constructor(
    @InjectRepository(CrmIntegration)
    private readonly crmIntegrationRepository: Repository<CrmIntegration>,
    @Inject(forwardRef(() => AccountLinkingService))
    private readonly accountLinkingService: AccountLinkingService,
  ) {}

  async createForEngine(
    tenantId: string,
    userId: string,
    dto: CreateCrmIntegrationDto,
  ): Promise<CrmIntegration> {
    // Only allow CUSTOM provider
    if (dto.provider !== CrmProvider.CUSTOM) {
      throw new BadRequestException('Only custom integrations are supported');
    }

    // Validate required fields based on integration type
    const metadata = dto.metadata || {};
    const integrationType = metadata.integrationType || 'https';
    
    if (integrationType === 'webhook' && !metadata.webhookUrl && !dto.apiUrl) {
      throw new BadRequestException('Webhook URL is required');
    }
    if (integrationType === 'https' && !metadata.requestUrl && !dto.apiUrl) {
      throw new BadRequestException('Request URL is required');
    }

    // Check if integration already exists for this tenant
    const existing = await this.crmIntegrationRepository.findOne({
      where: {
        tenantId,
        provider: CrmProvider.CUSTOM,
        type: CrmIntegrationType.ENGINE,
        isActive: true,
        name: dto.name,
      },
    });

    if (existing) {
      throw new ConflictException(`CRM integration with name "${dto.name}" already exists`);
    }

    // Encrypt sensitive data in metadata
    const processedMetadata = { ...metadata };
    if (metadata.basicAuthPassword) {
      processedMetadata.basicAuthPassword = this.encrypt(metadata.basicAuthPassword);
    }
    if (metadata.bearerToken && !dto.accessToken) {
      processedMetadata.bearerToken = this.encrypt(metadata.bearerToken);
    }
    if (metadata.apiKey && !dto.apiKey) {
      processedMetadata.apiKey = this.encrypt(metadata.apiKey);
    }
    if (metadata.webhookSecret) {
      processedMetadata.webhookSecret = this.encrypt(metadata.webhookSecret);
    }

    const integration = this.crmIntegrationRepository.create({
      tenantId,
      userId,
      type: CrmIntegrationType.ENGINE,
      provider: CrmProvider.CUSTOM,
      name: dto.name || 'Custom CRM Integration',
      apiKey: dto.apiKey ? this.encrypt(dto.apiKey) : null,
      accessToken: dto.accessToken ? this.encrypt(dto.accessToken) : null,
      refreshToken: dto.refreshToken ? this.encrypt(dto.refreshToken) : null,
      apiUrl: metadata.webhookUrl || metadata.requestUrl || dto.apiUrl,
      accountId: dto.accountId,
      syncDirection: dto.syncDirection || SyncDirection.BIDIRECTIONAL,
      fieldMappings: dto.fieldMappings || {},
      syncSettings: dto.syncSettings || {
        syncContacts: true,
        syncLeads: false,
        syncDeals: false,
        autoSync: false,
      },
      oauthConfig: dto.oauthConfig,
      syncToLinkedAccount: dto.syncToLinkedAccount || false,
      metadata: processedMetadata,
      isActive: true,
    });

    const saved = await this.crmIntegrationRepository.save(integration);

    // If syncToLinkedAccount is enabled, sync to marketplace
    if (saved.syncToLinkedAccount) {
      await this.syncToLinkedMarketplaceAccount(tenantId, saved);
    }

    this.logger.log(`Custom CRM integration created for Engine tenant ${tenantId}: ${dto.name}`);
    return saved;
  }

  async createForMarketplace(
    marketplaceUserId: string,
    dto: CreateCrmIntegrationDto,
  ): Promise<CrmIntegration> {
    // Only allow CUSTOM provider
    if (dto.provider !== CrmProvider.CUSTOM) {
      throw new BadRequestException('Only custom integrations are supported');
    }

    // Validate required fields based on integration type
    const metadata = dto.metadata || {};
    const integrationType = metadata.integrationType || 'https';
    
    if (integrationType === 'webhook' && !metadata.webhookUrl && !dto.apiUrl) {
      throw new BadRequestException('Webhook URL is required');
    }
    if (integrationType === 'https' && !metadata.requestUrl && !dto.apiUrl) {
      throw new BadRequestException('Request URL is required');
    }

    // Check if integration already exists for this marketplace user
    const existing = await this.crmIntegrationRepository.findOne({
      where: {
        marketplaceUserId,
        provider: CrmProvider.CUSTOM,
        type: CrmIntegrationType.MARKETPLACE,
        isActive: true,
        name: dto.name,
      },
    });

    if (existing) {
      throw new ConflictException(`CRM integration with name "${dto.name}" already exists`);
    }

    // Encrypt sensitive data in metadata
    const processedMetadata = { ...metadata };
    if (metadata.basicAuthPassword) {
      processedMetadata.basicAuthPassword = this.encrypt(metadata.basicAuthPassword);
    }
    if (metadata.bearerToken && !dto.accessToken) {
      processedMetadata.bearerToken = this.encrypt(metadata.bearerToken);
    }
    if (metadata.apiKey && !dto.apiKey) {
      processedMetadata.apiKey = this.encrypt(metadata.apiKey);
    }
    if (metadata.webhookSecret) {
      processedMetadata.webhookSecret = this.encrypt(metadata.webhookSecret);
    }

    const integration = this.crmIntegrationRepository.create({
      marketplaceUserId,
      type: CrmIntegrationType.MARKETPLACE,
      provider: CrmProvider.CUSTOM,
      name: dto.name || 'Custom CRM Integration',
      apiKey: dto.apiKey ? this.encrypt(dto.apiKey) : null,
      accessToken: dto.accessToken ? this.encrypt(dto.accessToken) : null,
      refreshToken: dto.refreshToken ? this.encrypt(dto.refreshToken) : null,
      apiUrl: metadata.webhookUrl || metadata.requestUrl || dto.apiUrl,
      accountId: dto.accountId,
      syncDirection: dto.syncDirection || SyncDirection.BIDIRECTIONAL,
      fieldMappings: dto.fieldMappings || {},
      syncSettings: dto.syncSettings || {
        syncContacts: true,
        syncLeads: false,
        syncDeals: false,
        autoSync: false,
      },
      oauthConfig: dto.oauthConfig,
      syncToLinkedAccount: dto.syncToLinkedAccount || false,
      metadata: processedMetadata,
      isActive: true,
    });

    const saved = await this.crmIntegrationRepository.save(integration);

    // If syncToLinkedAccount is enabled, sync to engine
    if (saved.syncToLinkedAccount) {
      await this.syncToLinkedEngineAccount(marketplaceUserId, saved);
    }

    this.logger.log(`Custom CRM integration created for Marketplace user ${marketplaceUserId}: ${dto.name}`);
    return saved;
  }

  async findAllForEngine(tenantId: string): Promise<CrmIntegration[]> {
    return this.crmIntegrationRepository.find({
      where: {
        tenantId,
        type: CrmIntegrationType.ENGINE,
      },
      order: { createdAt: 'DESC' },
    });
  }

  async findAllForMarketplace(marketplaceUserId: string): Promise<CrmIntegration[]> {
    return this.crmIntegrationRepository.find({
      where: {
        marketplaceUserId,
        type: CrmIntegrationType.MARKETPLACE,
      },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<CrmIntegration> {
    const integration = await this.crmIntegrationRepository.findOne({
      where: { id },
    });

    if (!integration) {
      throw new NotFoundException('CRM integration not found');
    }

    return integration;
  }

  async update(
    id: string,
    dto: UpdateCrmIntegrationDto,
    tenantId?: string,
    marketplaceUserId?: string,
  ): Promise<CrmIntegration> {
    const integration = await this.findOne(id);

    // Verify ownership
    if (tenantId && integration.tenantId !== tenantId) {
      throw new BadRequestException('Integration does not belong to this tenant');
    }
    if (marketplaceUserId && integration.marketplaceUserId !== marketplaceUserId) {
      throw new BadRequestException('Integration does not belong to this marketplace user');
    }

    // Update fields
    if (dto.name !== undefined) integration.name = dto.name;
    if (dto.apiKey !== undefined) integration.apiKey = dto.apiKey ? this.encrypt(dto.apiKey) : null;
    if (dto.accessToken !== undefined) integration.accessToken = dto.accessToken ? this.encrypt(dto.accessToken) : null;
    if (dto.refreshToken !== undefined) integration.refreshToken = dto.refreshToken ? this.encrypt(dto.refreshToken) : null;
    if (dto.apiUrl !== undefined) integration.apiUrl = dto.apiUrl;
    if (dto.accountId !== undefined) integration.accountId = dto.accountId;
    if (dto.isActive !== undefined) integration.isActive = dto.isActive;
    if (dto.syncDirection !== undefined) integration.syncDirection = dto.syncDirection;
    if (dto.fieldMappings !== undefined) integration.fieldMappings = dto.fieldMappings;
    if (dto.syncSettings !== undefined) integration.syncSettings = dto.syncSettings;
    if (dto.oauthConfig !== undefined) integration.oauthConfig = dto.oauthConfig;
    if (dto.syncToLinkedAccount !== undefined) integration.syncToLinkedAccount = dto.syncToLinkedAccount;
    
    // Process metadata and encrypt sensitive fields
    if (dto.metadata !== undefined) {
      const processedMetadata = { ...dto.metadata };
      if (processedMetadata.basicAuthPassword) {
        processedMetadata.basicAuthPassword = this.encrypt(processedMetadata.basicAuthPassword);
      }
      if (processedMetadata.bearerToken && !dto.accessToken) {
        processedMetadata.bearerToken = this.encrypt(processedMetadata.bearerToken);
      }
      if (processedMetadata.apiKey && !dto.apiKey) {
        processedMetadata.apiKey = this.encrypt(processedMetadata.apiKey);
      }
      if (processedMetadata.webhookSecret) {
        processedMetadata.webhookSecret = this.encrypt(processedMetadata.webhookSecret);
      }
      integration.metadata = processedMetadata;
      
      // Update apiUrl from metadata if present
      if (processedMetadata.webhookUrl || processedMetadata.requestUrl) {
        integration.apiUrl = processedMetadata.webhookUrl || processedMetadata.requestUrl;
      }
    }

    const updated = await this.crmIntegrationRepository.save(integration);

    // Sync to linked account if enabled
    if (updated.syncToLinkedAccount) {
      if (updated.type === CrmIntegrationType.ENGINE && updated.tenantId) {
        await this.syncToLinkedMarketplaceAccount(updated.tenantId, updated);
      } else if (updated.type === CrmIntegrationType.MARKETPLACE && updated.marketplaceUserId) {
        await this.syncToLinkedEngineAccount(updated.marketplaceUserId, updated);
      }
    }

    return updated;
  }

  async delete(id: string, tenantId?: string, marketplaceUserId?: string): Promise<void> {
    const integration = await this.findOne(id);

    // Verify ownership
    if (tenantId && integration.tenantId !== tenantId) {
      throw new BadRequestException('Integration does not belong to this tenant');
    }
    if (marketplaceUserId && integration.marketplaceUserId !== marketplaceUserId) {
      throw new BadRequestException('Integration does not belong to this marketplace user');
    }

    await this.crmIntegrationRepository.remove(integration);
    this.logger.log(`CRM integration deleted: ${id}`);
  }

  async testConnection(id: string): Promise<{ success: boolean; message: string }> {
    const integration = await this.findOne(id);
    
    if (integration.provider !== CrmProvider.CUSTOM) {
      return { success: false, message: 'Only custom integrations can be tested' };
    }

    const metadata = integration.metadata || {};
    const integrationType = metadata.integrationType || 'https'; // 'webhook' or 'https'

    try {
      if (integrationType === 'webhook') {
        return await this.testWebhook(integration, metadata);
      } else {
        return await this.testHttpsRequest(integration, metadata);
      }
    } catch (error: any) {
      this.logger.error(`Connection test failed for integration ${id}: ${error.message}`);
      return { 
        success: false, 
        message: error.response?.data?.message || error.message || 'Connection test failed' 
      };
    }
  }

  private async testWebhook(integration: CrmIntegration, metadata: any): Promise<{ success: boolean; message: string }> {
    const webhookUrl = metadata.webhookUrl || integration.apiUrl;
    if (!webhookUrl) {
      return { success: false, message: 'Webhook URL is required' };
    }

    // Validate URL format
    try {
      new URL(webhookUrl);
    } catch {
      return { success: false, message: 'Invalid webhook URL format' };
    }

    const testPayload = {
      event: 'test',
      timestamp: new Date().toISOString(),
      data: {
        test: true,
        integrationId: integration.id,
        integrationName: integration.name,
      },
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(metadata.headers || {}),
    };

    // Add webhook signature if secret is configured
    if (metadata.webhookSecret) {
      try {
        const decryptedSecret = this.decrypt(metadata.webhookSecret);
        const payloadString = JSON.stringify(testPayload);
        const signature = crypto
          .createHmac('sha256', decryptedSecret)
          .update(payloadString)
          .digest('hex');
        headers['X-Webhook-Signature'] = signature;
      } catch {
        // If decryption fails, try using as plain text (for backward compatibility)
        const payloadString = JSON.stringify(testPayload);
        const signature = crypto
          .createHmac('sha256', metadata.webhookSecret)
          .update(payloadString)
          .digest('hex');
        headers['X-Webhook-Signature'] = signature;
      }
    }

    const timeout = metadata.timeout || 10000;

    try {
      const response = await axios.post(webhookUrl, testPayload, {
        headers,
        timeout,
        validateStatus: (status) => status < 500, // Don't throw on 4xx errors
      });

      if (response.status >= 200 && response.status < 300) {
        return { success: true, message: `Webhook test successful (${response.status})` };
      } else {
        return { 
          success: false, 
          message: `Webhook returned status ${response.status}: ${response.statusText}` 
        };
      }
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        return { success: false, message: `Cannot connect to ${webhookUrl}. Check URL and network connectivity.` };
      }
      if (error.code === 'ETIMEDOUT') {
        return { success: false, message: `Request timed out after ${timeout}ms` };
      }
      throw error;
    }
  }

  private async testHttpsRequest(integration: CrmIntegration, metadata: any): Promise<{ success: boolean; message: string }> {
    const requestUrl = metadata.requestUrl || integration.apiUrl;
    if (!requestUrl) {
      return { success: false, message: 'Request URL is required' };
    }

    // Validate URL format
    try {
      new URL(requestUrl);
    } catch {
      return { success: false, message: 'Invalid request URL format' };
    }

    const method = (metadata.requestMethod || 'GET').toUpperCase();
    const headers: Record<string, string> = {
      'Content-Type': metadata.contentType || 'application/json',
      ...(metadata.headers || {}),
    };

    // Handle authentication
    const authType = metadata.authType || 'none';
    if (authType === 'basic') {
      const username = metadata.basicAuthUsername || '';
      let password = '';
      if (metadata.basicAuthPassword) {
        try {
          password = this.decrypt(metadata.basicAuthPassword);
        } catch {
          // If decryption fails, try using as plain text (for backward compatibility)
          password = metadata.basicAuthPassword;
        }
      }
      if (username && password) {
        const authString = Buffer.from(`${username}:${password}`).toString('base64');
        headers['Authorization'] = `Basic ${authString}`;
      }
    } else if (authType === 'bearer') {
      let token = '';
      if (integration.accessToken) {
        token = this.decrypt(integration.accessToken);
      } else if (metadata.bearerToken) {
        try {
          token = this.decrypt(metadata.bearerToken);
        } catch {
          token = metadata.bearerToken;
        }
      }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    } else if (authType === 'apikey') {
      let apiKey = '';
      if (integration.apiKey) {
        apiKey = this.decrypt(integration.apiKey);
      } else if (metadata.apiKey) {
        try {
          apiKey = this.decrypt(metadata.apiKey);
        } catch {
          apiKey = metadata.apiKey;
        }
      }
      const apiKeyHeader = metadata.apiKeyHeader || 'X-API-Key';
      if (apiKey) {
        headers[apiKeyHeader] = apiKey;
      }
    } else if (authType === 'custom') {
      // Custom auth headers are already in metadata.headers
    }

    const timeout = metadata.timeout || 10000;
    const testPayload = metadata.testPayload || {
      test: true,
      timestamp: new Date().toISOString(),
    };

    const config: AxiosRequestConfig = {
      method: method as any,
      url: requestUrl,
      headers,
      timeout,
      validateStatus: (status) => status < 500,
    };

    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      if (metadata.contentType === 'application/x-www-form-urlencoded') {
        const formData = new URLSearchParams();
        Object.entries(testPayload).forEach(([key, value]) => {
          formData.append(key, String(value));
        });
        config.data = formData.toString();
      } else if (metadata.contentType === 'application/xml') {
        config.data = metadata.testPayloadXml || '<test>true</test>';
      } else {
        config.data = testPayload;
      }
    }

    try {
      const response = await axios(config);

      if (response.status >= 200 && response.status < 300) {
        return { success: true, message: `${method} request successful (${response.status})` };
      } else {
        return { 
          success: false, 
          message: `${method} request returned status ${response.status}: ${response.statusText}` 
        };
      }
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        return { success: false, message: `Cannot connect to ${requestUrl}. Check URL and network connectivity.` };
      }
      if (error.code === 'ETIMEDOUT') {
        return { success: false, message: `Request timed out after ${timeout}ms` };
      }
      if (error.response) {
        return { 
          success: false, 
          message: `Request failed with status ${error.response.status}: ${error.response.statusText}` 
        };
      }
      throw error;
    }
  }

  private async syncToLinkedMarketplaceAccount(tenantId: string, engineIntegration: CrmIntegration): Promise<void> {
    try {
      const link = await this.accountLinkingService.getAccountLink(
        undefined,
        undefined,
        tenantId,
      );

      if (!link || !link.isActive) {
        this.logger.warn(`No active account link found for tenant ${tenantId}`);
        return;
      }

      // Check if marketplace integration already exists
      const existing = await this.crmIntegrationRepository.findOne({
        where: {
          marketplaceUserId: link.marketplaceUserId,
          provider: engineIntegration.provider,
          type: CrmIntegrationType.MARKETPLACE,
        },
      });

      if (existing) {
        // Update existing
        existing.name = engineIntegration.name;
        existing.apiKey = engineIntegration.apiKey;
        existing.accessToken = engineIntegration.accessToken;
        existing.refreshToken = engineIntegration.refreshToken;
        existing.apiUrl = engineIntegration.apiUrl;
        existing.accountId = engineIntegration.accountId;
        existing.syncDirection = engineIntegration.syncDirection;
        existing.fieldMappings = engineIntegration.fieldMappings;
        existing.syncSettings = engineIntegration.syncSettings;
        existing.oauthConfig = engineIntegration.oauthConfig;
        existing.linkedAccountSyncedAt = new Date();
        await this.crmIntegrationRepository.save(existing);
      } else {
        // Create new
        const marketplaceIntegration = this.crmIntegrationRepository.create({
          marketplaceUserId: link.marketplaceUserId,
          type: CrmIntegrationType.MARKETPLACE,
          provider: engineIntegration.provider,
          name: engineIntegration.name,
          apiKey: engineIntegration.apiKey,
          accessToken: engineIntegration.accessToken,
          refreshToken: engineIntegration.refreshToken,
          apiUrl: engineIntegration.apiUrl,
          accountId: engineIntegration.accountId,
          syncDirection: engineIntegration.syncDirection,
          fieldMappings: engineIntegration.fieldMappings,
          syncSettings: engineIntegration.syncSettings,
          oauthConfig: engineIntegration.oauthConfig,
          syncToLinkedAccount: false, // Don't create circular sync
          isActive: engineIntegration.isActive,
          linkedAccountSyncedAt: new Date(),
        });
        await this.crmIntegrationRepository.save(marketplaceIntegration);
      }

      this.logger.log(`Synced CRM integration to marketplace account for tenant ${tenantId}`);
    } catch (error) {
      this.logger.error(`Failed to sync CRM integration to marketplace: ${error.message}`);
    }
  }

  private async syncToLinkedEngineAccount(marketplaceUserId: string, marketplaceIntegration: CrmIntegration): Promise<void> {
    try {
      const link = await this.accountLinkingService.getAccountLink(
        undefined,
        marketplaceUserId,
      );

      if (!link || !link.isActive) {
        this.logger.warn(`No active account link found for marketplace user ${marketplaceUserId}`);
        return;
      }

      // Check if engine integration already exists
      const existing = await this.crmIntegrationRepository.findOne({
        where: {
          tenantId: link.engineTenantId,
          provider: marketplaceIntegration.provider,
          type: CrmIntegrationType.ENGINE,
        },
      });

      if (existing) {
        // Update existing
        existing.name = marketplaceIntegration.name;
        existing.apiKey = marketplaceIntegration.apiKey;
        existing.accessToken = marketplaceIntegration.accessToken;
        existing.refreshToken = marketplaceIntegration.refreshToken;
        existing.apiUrl = marketplaceIntegration.apiUrl;
        existing.accountId = marketplaceIntegration.accountId;
        existing.syncDirection = marketplaceIntegration.syncDirection;
        existing.fieldMappings = marketplaceIntegration.fieldMappings;
        existing.syncSettings = marketplaceIntegration.syncSettings;
        existing.oauthConfig = marketplaceIntegration.oauthConfig;
        existing.linkedAccountSyncedAt = new Date();
        await this.crmIntegrationRepository.save(existing);
      } else {
        // Create new
        const engineIntegration = this.crmIntegrationRepository.create({
          tenantId: link.engineTenantId,
          userId: link.engineUserId,
          type: CrmIntegrationType.ENGINE,
          provider: marketplaceIntegration.provider,
          name: marketplaceIntegration.name,
          apiKey: marketplaceIntegration.apiKey,
          accessToken: marketplaceIntegration.accessToken,
          refreshToken: marketplaceIntegration.refreshToken,
          apiUrl: marketplaceIntegration.apiUrl,
          accountId: marketplaceIntegration.accountId,
          syncDirection: marketplaceIntegration.syncDirection,
          fieldMappings: marketplaceIntegration.fieldMappings,
          syncSettings: marketplaceIntegration.syncSettings,
          oauthConfig: marketplaceIntegration.oauthConfig,
          syncToLinkedAccount: false, // Don't create circular sync
          isActive: marketplaceIntegration.isActive,
          linkedAccountSyncedAt: new Date(),
        });
        await this.crmIntegrationRepository.save(engineIntegration);
      }

      this.logger.log(`Synced CRM integration to engine account for marketplace user ${marketplaceUserId}`);
    } catch (error) {
      this.logger.error(`Failed to sync CRM integration to engine: ${error.message}`);
    }
  }

  private getDefaultFieldMappings(provider: CrmProvider): CrmIntegration['fieldMappings'] {
    const baseMappings = {
      contact: {
        firstName: 'firstName',
        lastName: 'lastName',
        email: 'email',
        phone: 'phone',
        company: 'company',
      },
    };

    // Provider-specific mappings
    switch (provider) {
      case CrmProvider.HUBSPOT:
        return {
          contact: {
            ...baseMappings.contact,
            firstName: 'firstname',
            lastName: 'lastname',
            phone: 'phone',
            company: 'company',
          },
        };
      case CrmProvider.SALESFORCE:
        return {
          contact: {
            ...baseMappings.contact,
            firstName: 'FirstName',
            lastName: 'LastName',
            email: 'Email',
            phone: 'Phone',
            company: 'Company',
          },
        };
      default:
        return baseMappings;
    }
  }

  private encrypt(text: string): string {
    const cipher = crypto.createCipher('aes-256-cbc', this.encryptionSecret);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  private decrypt(encryptedText: string): string {
    const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionSecret);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}

