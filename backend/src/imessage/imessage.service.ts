import { Injectable, Logger, BadRequestException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { ConfigService as AppConfigService } from '../config/config.service';

@Injectable()
export class ImessageService implements OnModuleInit {
  private readonly logger = new Logger(ImessageService.name);
  private apiUrl: string;
  private apiKey: string;

  constructor(
    private readonly nestConfigService: ConfigService,
    private readonly configService: AppConfigService,
  ) {}

  async onModuleInit() {
    // Get iMessage API URL from config, default to localhost:5002
    const configUrl = await this.configService.get('IMESSAGE_API_URL');
    this.apiUrl = configUrl || 'http://localhost:5002';
    
    // Get API key from config
    const configApiKey = await this.configService.get('IMESSAGE_API_KEY');
    if (!configApiKey) {
      this.logger.warn('IMESSAGE_API_KEY not configured. iMessage functionality will be limited.');
    }
    this.apiKey = configApiKey || '';
    
    this.logger.log(`iMessage service initialized with API URL: ${this.apiUrl}`);
  }

  /**
   * Send a message via iMessage
   * @param tenantId Tenant ID for routing
   * @param recipient Phone number or contact name
   * @param message Message content
   * @param account Optional account ID to send from
   * @returns Message result with status
   */
  async sendMessage(
    tenantId: string,
    recipient: string,
    message: string,
    account?: string,
  ): Promise<{
    status: string;
    recipient: string;
    tenantId: string;
    timestamp?: string;
  }> {
    if (!this.apiKey) {
      throw new BadRequestException('iMessage API key not configured');
    }

    try {
      const url = `${this.apiUrl}/send`;
      const params = new URLSearchParams();
      params.append('name', 'false'); // Treat recipient as phone number

      const payload: any = {
        recipient,
        message,
      };

      // Add tenant ID to message for routing (append to message or use metadata)
      // We'll include tenantId in a custom header or as part of the webhook callback
      const headers: any = {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json',
        'X-Tenant-ID': tenantId, // Custom header for tenant routing
      };

      if (account) {
        payload.account = account;
      }

      this.logger.log(`Sending iMessage to ${recipient} for tenant ${tenantId}`);

      const response = await axios.post(url, payload, {
        headers,
        params: { name: 'false' },
      });

      return {
        status: response.data.status || 'ok',
        recipient: response.data.recipient || recipient,
        tenantId,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      this.logger.error(`Failed to send iMessage: ${error.message}`, error.stack);
      const errorMessage = error?.response?.data?.error || error?.message || 'Unknown error';
      throw new BadRequestException(`Failed to send iMessage: ${errorMessage}`);
    }
  }

  /**
   * Send a message to a conversation
   * @param tenantId Tenant ID
   * @param contactId Contact ID (phone number)
   * @param message Message content
   * @param account Optional account ID
   * @returns Message result
   */
  async sendToConversation(
    tenantId: string,
    contactId: string,
    message: string,
    account?: string,
  ): Promise<any> {
    if (!this.apiKey) {
      throw new BadRequestException('iMessage API key not configured');
    }

    try {
      const url = `${this.apiUrl}/conversations/${encodeURIComponent(contactId)}/messages`;
      
      const payload: any = {
        message,
        use_imessage: true, // Prefer iMessage over SMS
      };

      if (account) {
        payload.account = account;
      }

      const headers: any = {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json',
        'X-Tenant-ID': tenantId,
      };

      this.logger.log(`Sending iMessage to conversation ${contactId} for tenant ${tenantId}`);

      const response = await axios.post(url, payload, { headers });

      return response.data;
    } catch (error: any) {
      this.logger.error(`Failed to send iMessage to conversation: ${error.message}`, error.stack);
      const errorMessage = error?.response?.data?.error || error?.message || 'Unknown error';
      throw new BadRequestException(`Failed to send iMessage: ${errorMessage}`);
    }
  }

  /**
   * Get available accounts
   * @returns List of available iMessage accounts
   */
  async getAccounts(): Promise<any> {
    if (!this.apiKey) {
      throw new BadRequestException('iMessage API key not configured');
    }

    try {
      const url = `${this.apiUrl}/accounts`;
      const headers = {
        'X-API-Key': this.apiKey,
      };

      const response = await axios.get(url, { headers });

      return response.data;
    } catch (error: any) {
      this.logger.error(`Failed to get iMessage accounts: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to get accounts: ${error.message}`);
    }
  }
}
