import { Injectable, NotFoundException, BadRequestException, Optional, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as twilio from 'twilio';
import { TwilioConfig } from '../entities/twilio-config.entity';
import { TwilioNumber } from '../entities/twilio-number.entity';
import { NumberPool } from '../entities/number-pool.entity';
import { BillingUsageService } from '../billing/billing-usage.service';
import { BillingUsageType } from '../entities/billing-usage.entity';

@Injectable()
export class TwilioService {
  private getTwilioClient(accountSid: string, authToken: string): twilio.Twilio {
    return twilio(accountSid, authToken);
  }

  constructor(
    @InjectRepository(TwilioConfig)
    private twilioConfigRepository: Repository<TwilioConfig>,
    @InjectRepository(TwilioNumber)
    private twilioNumberRepository: Repository<TwilioNumber>,
    @InjectRepository(NumberPool)
    private numberPoolRepository: Repository<NumberPool>,
    private configService: ConfigService,
    @Optional()
    @Inject(BillingUsageService)
    private billingUsageService?: BillingUsageService,
  ) {}

  async getConfig(tenantId: string): Promise<TwilioConfig> {
    const config = await this.twilioConfigRepository.findOne({
      where: { tenantId, isActive: true },
    });

    if (!config) {
      throw new NotFoundException('Twilio configuration not found');
    }

    return config;
  }

  async createConfig(
    tenantId: string,
    accountSid: string,
    authToken: string,
    messagingServiceSid?: string,
  ): Promise<TwilioConfig> {
    // Verify credentials by making a test API call
    const client = this.getTwilioClient(accountSid, authToken);
    try {
      await client.api.accounts(accountSid).fetch();
    } catch (error) {
      throw new BadRequestException('Invalid Twilio credentials');
    }

    // Get base URL for webhooks - use HTTPS with proper domain
    let baseUrl = this.configService.get<string>('BACKEND_URL') || 
                  this.configService.get<string>('WEBHOOK_BASE_URL') ||
                  'https://api.nurtureengine.net';
    
    // Ensure HTTPS and proper domain
    if (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1') || baseUrl.includes('34.29.105.211')) {
      baseUrl = 'https://api.nurtureengine.net';
    }
    // Ensure HTTPS
    if (!baseUrl.startsWith('https://')) {
      baseUrl = baseUrl.replace('http://', 'https://');
    }
    // Remove port if present (should use standard HTTPS port 443)
    baseUrl = baseUrl.replace(/:(\d+)/, '');
    
    const statusCallbackUrl = `${baseUrl}/api/webhooks/twilio/status`;
    const smsUrl = `${baseUrl}/api/webhooks/twilio/inbound`;

    const existingConfig = await this.twilioConfigRepository.findOne({
      where: { tenantId },
    });

    if (existingConfig) {
      existingConfig.accountSid = accountSid;
      existingConfig.authToken = authToken; // TODO: Encrypt this
      existingConfig.messagingServiceSid = messagingServiceSid;
      existingConfig.isActive = true;
      const savedConfig = await this.twilioConfigRepository.save(existingConfig);
      
      // Update webhook URLs for all phone numbers
      await this.updatePhoneNumberWebhooks(tenantId, accountSid, authToken, statusCallbackUrl, smsUrl);
      
      return savedConfig;
    }

    const config = this.twilioConfigRepository.create({
      tenantId,
      accountSid,
      authToken, // TODO: Encrypt this
      messagingServiceSid,
    });

    const savedConfig = await this.twilioConfigRepository.save(config);
    
    // Update webhook URLs for all phone numbers
    await this.updatePhoneNumberWebhooks(tenantId, accountSid, authToken, statusCallbackUrl, smsUrl);
    
    return savedConfig;
  }

  private async updatePhoneNumberWebhooks(
    tenantId: string,
    accountSid: string,
    authToken: string,
    statusCallbackUrl: string,
    smsUrl: string,
  ): Promise<void> {
    const client = this.getTwilioClient(accountSid, authToken);
    const numbers = await this.twilioNumberRepository.find({
      where: { tenantId },
    });

    for (const number of numbers) {
      try {
        await client.incomingPhoneNumbers(number.twilioSid).update({
          statusCallback: statusCallbackUrl,
          smsUrl: smsUrl,
          smsMethod: 'POST',
          statusCallbackMethod: 'POST',
        });
      } catch (error) {
        console.error(`Failed to update webhooks for number ${number.phoneNumber}:`, error);
        // Continue with other numbers even if one fails
      }
    }
  }

  async importNumbers(tenantId: string): Promise<TwilioNumber[]> {
    const config = await this.getConfig(tenantId);
    const client = this.getTwilioClient(config.accountSid, config.authToken);

    // Get base URL for webhooks - use HTTPS with proper domain
    let baseUrl = this.configService.get<string>('BACKEND_URL') || 
                  this.configService.get<string>('WEBHOOK_BASE_URL') ||
                  'https://api.nurtureengine.net';
    
    // Ensure HTTPS and proper domain
    if (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1') || baseUrl.includes('34.29.105.211')) {
      baseUrl = 'https://api.nurtureengine.net';
    }
    // Ensure HTTPS
    if (!baseUrl.startsWith('https://')) {
      baseUrl = baseUrl.replace('http://', 'https://');
    }
    // Remove port if present (should use standard HTTPS port 443)
    baseUrl = baseUrl.replace(/:(\d+)/, '');
    
    const statusCallbackUrl = `${baseUrl}/api/webhooks/twilio/status`;
    const smsUrl = `${baseUrl}/api/webhooks/twilio/inbound`;

    let incomingNumbers;
    
    // If messaging service is configured, only get numbers assigned to it
    if (config.messagingServiceSid) {
      const serviceNumbers = await client.messaging.v1
        .services(config.messagingServiceSid)
        .phoneNumbers.list();
      const serviceSids = new Set(serviceNumbers.map((n) => n.sid));
      
      // Get all incoming numbers and filter by messaging service
      const allNumbers = await client.incomingPhoneNumbers.list();
      incomingNumbers = allNumbers.filter((n) => serviceSids.has(n.sid));
    } else {
      incomingNumbers = await client.incomingPhoneNumbers.list();
    }

    const importedNumbers: TwilioNumber[] = [];

    for (const number of incomingNumbers) {
      const existing = await this.twilioNumberRepository.findOne({
        where: { twilioSid: number.sid, tenantId },
      });

      // Update webhook URLs for this number
      try {
        await client.incomingPhoneNumbers(number.sid).update({
          statusCallback: statusCallbackUrl,
          smsUrl: smsUrl,
          smsMethod: 'POST',
          statusCallbackMethod: 'POST',
        });
      } catch (error) {
        console.error(`Failed to update webhooks for number ${number.phoneNumber}:`, error);
      }

      if (existing) {
        // Update existing
        existing.phoneNumber = number.phoneNumber;
        existing.capabilities = number.capabilities as any;
        existing.friendlyName = number.friendlyName || null;
        existing.status = number.status;
        importedNumbers.push(await this.twilioNumberRepository.save(existing));
      } else {
        // Create new
        const twilioNumber = this.twilioNumberRepository.create({
          tenantId,
          phoneNumber: number.phoneNumber,
          twilioSid: number.sid,
          capabilities: number.capabilities as any,
          friendlyName: number.friendlyName || null,
          status: number.status,
        });
        importedNumbers.push(await this.twilioNumberRepository.save(twilioNumber));
      }
    }

    return importedNumbers;
  }

  async purchaseNumber(
    tenantId: string,
    areaCode: string,
  ): Promise<TwilioNumber> {
    const config = await this.getConfig(tenantId);
    const client = this.getTwilioClient(config.accountSid, config.authToken);

    // Get base URL for webhooks - use HTTPS with proper domain
    let baseUrl = this.configService.get<string>('BACKEND_URL') || 
                  this.configService.get<string>('WEBHOOK_BASE_URL') ||
                  'https://api.nurtureengine.net';
    
    // Ensure HTTPS and proper domain
    if (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1') || baseUrl.includes('34.29.105.211')) {
      baseUrl = 'https://api.nurtureengine.net';
    }
    // Ensure HTTPS
    if (!baseUrl.startsWith('https://')) {
      baseUrl = baseUrl.replace('http://', 'https://');
    }
    // Remove port if present (should use standard HTTPS port 443)
    baseUrl = baseUrl.replace(/:(\d+)/, '');
    
    const statusCallbackUrl = `${baseUrl}/api/webhooks/twilio/status`;
    const smsUrl = `${baseUrl}/api/webhooks/twilio/inbound`;

    try {
      const availableNumbers = await client.availablePhoneNumbers('US')
        .local.list({ areaCode: parseInt(areaCode, 10), limit: 1 });

      if (availableNumbers.length === 0) {
        throw new BadRequestException('No numbers available for this area code');
      }

      const number = availableNumbers[0];
      const purchased = await client.incomingPhoneNumbers.create({
        phoneNumber: number.phoneNumber,
        statusCallback: statusCallbackUrl,
        smsUrl: smsUrl,
        smsMethod: 'POST',
        statusCallbackMethod: 'POST',
      });

      // If messaging service is configured, assign number to it
      if (config.messagingServiceSid) {
        try {
          await client.messaging.v1
            .services(config.messagingServiceSid)
            .phoneNumbers.create({ phoneNumberSid: purchased.sid });
        } catch (error) {
          console.error('Failed to assign number to messaging service:', error);
        }
      }

      const twilioNumber = this.twilioNumberRepository.create({
        tenantId,
        phoneNumber: purchased.phoneNumber,
        twilioSid: purchased.sid,
        capabilities: purchased.capabilities as any,
        friendlyName: purchased.friendlyName || null,
        status: purchased.status,
      });

      return this.twilioNumberRepository.save(twilioNumber);
    } catch (error) {
      throw new BadRequestException('Failed to purchase number');
    }
  }

  async createNumberPool(
    tenantId: string,
    name: string,
    description?: string,
    maxMessagesPerDay?: number | null,
  ): Promise<NumberPool> {
    const pool = this.numberPoolRepository.create({
      tenantId,
      name,
      description,
      maxMessagesPerDay: maxMessagesPerDay !== undefined ? maxMessagesPerDay : null,
    });

    return this.numberPoolRepository.save(pool);
  }

  async assignNumberToPool(
    tenantId: string,
    numberId: string,
    poolId: string,
  ): Promise<TwilioNumber> {
    const number = await this.twilioNumberRepository.findOne({
      where: { id: numberId, tenantId },
    });

    if (!number) {
      throw new NotFoundException('Number not found');
    }

    const pool = await this.numberPoolRepository.findOne({
      where: { id: poolId, tenantId },
    });

    if (!pool) {
      throw new NotFoundException('Number pool not found');
    }

    number.numberPoolId = poolId;
    return this.twilioNumberRepository.save(number);
  }

  async sendSMS(
    tenantId: string,
    to: string,
    body: string,
    fromNumberId?: string,
  ): Promise<any> {
    const config = await this.getConfig(tenantId);
    const client = this.getTwilioClient(config.accountSid, config.authToken);

    let from: string;

    if (fromNumberId) {
      const number = await this.twilioNumberRepository.findOne({
        where: { id: fromNumberId, tenantId },
      });
      if (!number) {
        throw new NotFoundException('From number not found');
      }
      from = number.phoneNumber;
    } else if (config.messagingServiceSid) {
      from = config.messagingServiceSid;
    } else {
      throw new BadRequestException('No messaging service or number configured');
    }

    // Get base URL for status callbacks
    const baseUrl = this.configService.get<string>('BACKEND_URL') || 
                    this.configService.get<string>('WEBHOOK_BASE_URL') ||
                    'http://localhost:5002';
    const statusCallbackUrl = `${baseUrl}/api/webhooks/twilio/status`;

    try {
      const messageOptions: any = {
        to,
        body,
        from: from.startsWith('MG') ? undefined : from,
        messagingServiceSid: from.startsWith('MG') ? from : undefined,
        statusCallback: statusCallbackUrl,
      };
      
      const message = await client.messages.create(messageOptions);

      // Track billing usage
      if (this.billingUsageService && message.sid) {
        try {
          await this.billingUsageService.trackUsage({
            tenantId,
            usageType: BillingUsageType.SMS_SENT,
            quantity: 1,
            resourceId: message.sid,
            resourceType: 'sms',
            metadata: {
              messageSid: message.sid,
              to,
              from,
              fromNumberId,
            },
          });
        } catch (error) {
          console.error('Failed to track SMS usage:', error);
        }
      }

      return message;
    } catch (error: any) {
      console.error('Twilio SMS send error:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      const errorCode = error?.code || 'UNKNOWN';
      throw new BadRequestException(`Failed to send SMS (${errorCode}): ${errorMessage}`);
    }
  }

  async makeCall(
    tenantId: string,
    to: string,
    voiceMessageUrl: string,
    fromNumberId?: string,
    recordCall: boolean = false,
  ): Promise<any> {
    const config = await this.getConfig(tenantId);
    const client = this.getTwilioClient(config.accountSid, config.authToken);

    let from: string;

    if (fromNumberId) {
      const number = await this.twilioNumberRepository.findOne({
        where: { id: fromNumberId, tenantId },
      });
      if (!number) {
        throw new NotFoundException('From number not found');
      }
      from = number.phoneNumber;
    } else {
      // Get first available number
      const numbers = await this.getNumbers(tenantId);
      if (!numbers.data || numbers.data.length === 0) {
        throw new BadRequestException('No Twilio numbers configured for this tenant');
      }
      from = numbers.data[0].phoneNumber;
    }

    // Get base URL for status callbacks
    const baseUrl = this.configService.get<string>('BACKEND_URL') || 
                    this.configService.get<string>('WEBHOOK_BASE_URL') ||
                    'http://localhost:5002';
    const statusCallbackUrl = `${baseUrl}/api/webhooks/twilio/call-status`;

    try {
      const call = await client.calls.create({
        to,
        from,
        url: voiceMessageUrl, // TwiML URL or direct audio URL
        method: 'POST',
        statusCallback: statusCallbackUrl,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
        statusCallbackMethod: 'POST',
        record: recordCall,
      });

      // Track billing usage
      if (this.billingUsageService && call.sid) {
        try {
          await this.billingUsageService.trackUsage({
            tenantId,
            usageType: BillingUsageType.CALL_MADE,
            quantity: 1,
            resourceId: call.sid,
            resourceType: 'call',
            metadata: {
              callSid: call.sid,
              to,
              from,
              fromNumberId,
              recordCall,
            },
          });
        } catch (error) {
          console.error('Failed to track call usage:', error);
        }
      }

      return call;
    } catch (error: any) {
      console.error('Twilio call error:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      const errorCode = error?.code || 'UNKNOWN';
      throw new BadRequestException(`Failed to make call (${errorCode}): ${errorMessage}`);
    }
  }

  async getNumbers(
    tenantId: string,
    poolId?: string,
    page: number = 1,
    limit: number = 50,
  ): Promise<{ data: TwilioNumber[]; total: number; page: number; limit: number }> {
    const config = await this.getConfig(tenantId);
    const skip = (page - 1) * limit;

    const where: any = { tenantId };
    if (poolId) {
      where.numberPoolId = poolId;
    }

    // Always filter by messaging service SID if configured
    if (config.messagingServiceSid) {
      const client = this.getTwilioClient(config.accountSid, config.authToken);
      try {
        // Get phone numbers assigned to the messaging service
        const serviceNumbers = await client.messaging.v1
          .services(config.messagingServiceSid)
          .phoneNumbers.list();
        const serviceSids = new Set(serviceNumbers.map((n) => n.sid));

        if (serviceSids.size === 0) {
          // No numbers assigned to messaging service
          return {
            data: [],
            total: 0,
            page,
            limit,
          };
        }

        // Filter numbers by those assigned to the messaging service
        const allNumbers = await this.twilioNumberRepository.find({
          where,
          relations: ['numberPool'],
          order: { createdAt: 'DESC' },
        });

        const filteredNumbers = allNumbers.filter((n) => serviceSids.has(n.twilioSid));
        const paginatedNumbers = filteredNumbers.slice(skip, skip + limit);

        return {
          data: paginatedNumbers,
          total: filteredNumbers.length,
          page,
          limit,
        };
      } catch (error) {
        // If error fetching from Twilio, return empty result to avoid showing wrong numbers
        console.error('Error fetching messaging service numbers:', error);
        return {
          data: [],
          total: 0,
          page,
          limit,
        };
      }
    }

    // If no messaging service configured, return all numbers with pagination
    const [data, total] = await this.twilioNumberRepository.findAndCount({
      where,
      relations: ['numberPool'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return { data, total, page, limit };
  }

  async getNumberPools(tenantId: string): Promise<NumberPool[]> {
    return this.numberPoolRepository.find({
      where: { tenantId },
      relations: ['numbers'],
    });
  }

  async updateNumberPool(
    tenantId: string,
    poolId: string,
    updates: { name?: string; description?: string; maxMessagesPerDay?: number | null; isActive?: boolean },
  ): Promise<NumberPool> {
    const pool = await this.numberPoolRepository.findOne({
      where: { id: poolId, tenantId },
    });

    if (!pool) {
      throw new NotFoundException('Number pool not found');
    }

    if (updates.name !== undefined) pool.name = updates.name;
    if (updates.description !== undefined) pool.description = updates.description;
    if (updates.maxMessagesPerDay !== undefined) pool.maxMessagesPerDay = updates.maxMessagesPerDay;
    if (updates.isActive !== undefined) pool.isActive = updates.isActive;

    return this.numberPoolRepository.save(pool);
  }

  async updateNumber(
    tenantId: string,
    numberId: string,
    updates: { maxMessagesPerDay?: number | null; friendlyName?: string },
  ): Promise<TwilioNumber> {
    const number = await this.twilioNumberRepository.findOne({
      where: { id: numberId, tenantId },
    });

    if (!number) {
      throw new NotFoundException('Number not found');
    }

    if (updates.maxMessagesPerDay !== undefined) number.maxMessagesPerDay = updates.maxMessagesPerDay;
    if (updates.friendlyName !== undefined) number.friendlyName = updates.friendlyName;

    return this.twilioNumberRepository.save(number);
  }

  async removeNumberFromPool(tenantId: string, numberId: string): Promise<TwilioNumber> {
    const number = await this.twilioNumberRepository.findOne({
      where: { id: numberId, tenantId },
    });

    if (!number) {
      throw new NotFoundException('Number not found');
    }

    number.numberPoolId = null;
    return this.twilioNumberRepository.save(number);
  }

  async deleteNumberPool(tenantId: string, poolId: string): Promise<void> {
    const pool = await this.numberPoolRepository.findOne({
      where: { id: poolId, tenantId },
      relations: ['numbers'],
    });

    if (!pool) {
      throw new NotFoundException('Number pool not found');
    }

    // Remove all numbers from pool first
    if (pool.numbers && pool.numbers.length > 0) {
      for (const number of pool.numbers) {
        number.numberPoolId = null;
        await this.twilioNumberRepository.save(number);
      }
    }

    await this.numberPoolRepository.remove(pool);
  }

  async testConnection(tenantId: string): Promise<{ success: boolean; message: string }> {
    try {
      const config = await this.getConfig(tenantId);
      const client = this.getTwilioClient(config.accountSid, config.authToken);
      await client.api.accounts(config.accountSid).fetch();
      return { success: true, message: 'Connection successful' };
    } catch (error: any) {
      return { success: false, message: error.message || 'Connection failed' };
    }
  }

  async verifyWebhooks(tenantId: string): Promise<{
    success: boolean;
    expectedSmsUrl: string;
    expectedStatusUrl: string;
    numbers: Array<{
      phoneNumber: string;
      twilioSid: string;
      currentSmsUrl: string | null;
      currentStatusUrl: string | null;
      smsUrlMatches: boolean;
      statusUrlMatches: boolean;
      isCorrect: boolean;
      error?: string;
    }>;
    messagingService: {
      sid: string | null;
      inboundRequestUrl: string | null;
      statusCallback: string | null;
      inboundUrlMatches: boolean;
      statusUrlMatches: boolean;
      isCorrect: boolean;
      error?: string;
    };
  }> {
    const config = await this.getConfig(tenantId);
    const client = this.getTwilioClient(config.accountSid, config.authToken);

    // Get base URL for webhooks - use HTTPS with proper domain
    const baseUrl = this.configService.get<string>('BACKEND_URL') || 
                    this.configService.get<string>('WEBHOOK_BASE_URL') ||
                    'https://api.nurtureengine.net';
    
    // Ensure HTTPS and proper domain
    let webhookBaseUrl = baseUrl;
    if (webhookBaseUrl.includes('localhost') || webhookBaseUrl.includes('127.0.0.1') || webhookBaseUrl.includes('34.29.105.211')) {
      webhookBaseUrl = 'https://api.nurtureengine.net';
    }
    // Ensure HTTPS
    if (!webhookBaseUrl.startsWith('https://')) {
      webhookBaseUrl = webhookBaseUrl.replace('http://', 'https://');
    }
    // Remove port if present (should use standard HTTPS port 443)
    webhookBaseUrl = webhookBaseUrl.replace(/:(\d+)/, '');

    const expectedStatusUrl = `${webhookBaseUrl}/api/webhooks/twilio/status`;
    const expectedSmsUrl = `${webhookBaseUrl}/api/webhooks/twilio/inbound`;

    // Get all phone number webhooks
    const numbers = await this.twilioNumberRepository.find({
      where: { tenantId },
    });

    const numberResults = [];

    for (const number of numbers) {
      try {
        const twilioNumber = await client.incomingPhoneNumbers(number.twilioSid).fetch();
        const currentSmsUrl = twilioNumber.smsUrl || null;
        const currentStatusUrl = twilioNumber.statusCallback || null;
        const smsUrlMatches = currentSmsUrl === expectedSmsUrl;
        const statusUrlMatches = currentStatusUrl === expectedStatusUrl;
        const isCorrect = smsUrlMatches && statusUrlMatches;

        numberResults.push({
          phoneNumber: number.phoneNumber,
          twilioSid: number.twilioSid,
          currentSmsUrl,
          currentStatusUrl,
          smsUrlMatches,
          statusUrlMatches,
          isCorrect,
        });
      } catch (error: any) {
        numberResults.push({
          phoneNumber: number.phoneNumber,
          twilioSid: number.twilioSid,
          currentSmsUrl: null,
          currentStatusUrl: null,
          smsUrlMatches: false,
          statusUrlMatches: false,
          isCorrect: false,
          error: error.message || 'Failed to fetch webhook configuration',
        });
      }
    }

    // Check messaging service webhooks if configured
    let messagingServiceResult: {
      sid: string | null;
      inboundRequestUrl: string | null;
      statusCallback: string | null;
      inboundUrlMatches: boolean;
      statusUrlMatches: boolean;
      isCorrect: boolean;
      error?: string;
    } = {
      sid: null,
      inboundRequestUrl: null,
      statusCallback: null,
      inboundUrlMatches: false,
      statusUrlMatches: false,
      isCorrect: false,
    };

    if (config.messagingServiceSid) {
      try {
        const service = await client.messaging.v1.services(config.messagingServiceSid).fetch();
        messagingServiceResult = {
          sid: config.messagingServiceSid,
          inboundRequestUrl: service.inboundRequestUrl || null,
          statusCallback: service.statusCallback || null,
          inboundUrlMatches: service.inboundRequestUrl === expectedSmsUrl,
          statusUrlMatches: service.statusCallback === expectedStatusUrl,
          isCorrect: service.inboundRequestUrl === expectedSmsUrl && service.statusCallback === expectedStatusUrl,
        };
      } catch (error: any) {
        messagingServiceResult.error = error.message || 'Failed to fetch messaging service configuration';
      }
    }

    return {
      success: true,
      expectedSmsUrl,
      expectedStatusUrl,
      numbers: numberResults,
      messagingService: messagingServiceResult,
    };
  }

  async updateAllWebhooks(tenantId: string): Promise<{
    success: boolean;
    message: string;
    numbersUpdated: number;
    messagingServiceUpdated: boolean;
  }> {
    const config = await this.getConfig(tenantId);
    const client = this.getTwilioClient(config.accountSid, config.authToken);

    // Get base URL for webhooks - use HTTPS with proper domain
    const baseUrl = this.configService.get<string>('BACKEND_URL') || 
                    this.configService.get<string>('WEBHOOK_BASE_URL') ||
                    'https://api.nurtureengine.net';
    
    // Ensure HTTPS and proper domain
    let webhookBaseUrl = baseUrl;
    if (webhookBaseUrl.includes('localhost') || webhookBaseUrl.includes('127.0.0.1') || webhookBaseUrl.includes('34.29.105.211')) {
      webhookBaseUrl = 'https://api.nurtureengine.net';
    }
    // Ensure HTTPS
    if (!webhookBaseUrl.startsWith('https://')) {
      webhookBaseUrl = webhookBaseUrl.replace('http://', 'https://');
    }
    // Remove port if present (should use standard HTTPS port 443)
    webhookBaseUrl = webhookBaseUrl.replace(/:(\d+)/, '');

    const statusCallbackUrl = `${webhookBaseUrl}/api/webhooks/twilio/status`;
    const smsUrl = `${webhookBaseUrl}/api/webhooks/twilio/inbound`;

    let numbersUpdated = 0;
    let messagingServiceUpdated = false;

    // Update all phone number webhooks
    const numbers = await this.twilioNumberRepository.find({
      where: { tenantId },
    });

    for (const number of numbers) {
      try {
        await client.incomingPhoneNumbers(number.twilioSid).update({
          statusCallback: statusCallbackUrl,
          smsUrl: smsUrl,
          smsMethod: 'POST',
          statusCallbackMethod: 'POST',
        });
        numbersUpdated++;
      } catch (error: any) {
        console.error(`Failed to update webhooks for number ${number.phoneNumber}:`, error.message);
      }
    }

    // Update messaging service webhooks if configured
    if (config.messagingServiceSid) {
      try {
        await client.messaging.v1
          .services(config.messagingServiceSid)
          .update({
            inboundRequestUrl: smsUrl,
            inboundMethod: 'POST',
            statusCallback: statusCallbackUrl,
            fallbackUrl: smsUrl,
            fallbackMethod: 'POST',
          });
        messagingServiceUpdated = true;
      } catch (error: any) {
        console.error(`Failed to update messaging service webhooks:`, error.message);
      }
    }

    return {
      success: true,
      message: `Updated webhooks: ${numbersUpdated} phone numbers${messagingServiceUpdated ? ' and messaging service' : ''}`,
      numbersUpdated,
      messagingServiceUpdated,
    };
  }
}

