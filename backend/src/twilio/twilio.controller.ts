import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { TwilioService } from './twilio.service';
import { TenantLimitsService } from '../tenant-limits/tenant-limits.service';
import { BillingUsageService } from '../billing/billing-usage.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TenantId } from '../common/decorators/tenant-id.decorator';

@Controller('twilio')
@UseGuards(JwtAuthGuard, TenantGuard)
export class TwilioController {
  constructor(
    private readonly twilioService: TwilioService,
    private readonly tenantLimitsService: TenantLimitsService,
    private readonly billingUsageService: BillingUsageService,
  ) {}

  @Post('config')
  async createConfig(
    @TenantId() tenantId: string,
    @Body()
    body: {
      accountSid: string;
      authToken: string;
      messagingServiceSid?: string;
    },
  ) {
    return this.twilioService.createConfig(
      tenantId,
      body.accountSid,
      body.authToken,
      body.messagingServiceSid,
    );
  }

  @Get('config')
  async getConfig(@TenantId() tenantId: string) {
    const config = await this.twilioService.getConfig(tenantId);
    // Don't expose auth token in response
    return {
      ...config,
      authToken: config.authToken ? '***' : undefined,
    };
  }

  @Post('numbers/import')
  async importNumbers(@TenantId() tenantId: string) {
    return this.twilioService.importNumbers(tenantId);
  }

  @Post('numbers/purchase')
  async purchaseNumber(
    @TenantId() tenantId: string,
    @Body() body: { areaCode: string },
  ) {
    return this.twilioService.purchaseNumber(tenantId, body.areaCode);
  }

  @Get('numbers')
  async getNumbers(
    @TenantId() tenantId: string,
    @Query('poolId') poolId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.twilioService.getNumbers(tenantId, poolId, pageNum, limitNum);
  }

  @Post('pools')
  async createNumberPool(
    @TenantId() tenantId: string,
    @Body() body: { name: string; description?: string; maxMessagesPerDay?: number | null },
  ) {
    return this.twilioService.createNumberPool(
      tenantId,
      body.name,
      body.description,
      body.maxMessagesPerDay,
    );
  }

  @Get('pools')
  async getNumberPools(@TenantId() tenantId: string) {
    return this.twilioService.getNumberPools(tenantId);
  }

  @Post('numbers/:numberId/assign-pool')
  async assignNumberToPool(
    @TenantId() tenantId: string,
    @Param('numberId') numberId: string,
    @Body() body: { poolId: string },
  ) {
    return this.twilioService.assignNumberToPool(
      tenantId,
      numberId,
      body.poolId,
    );
  }

  @Post('send-sms')
  async sendSMS(
    @TenantId() tenantId: string,
    @Body() body: { to: string; body: string; fromNumberId?: string },
  ) {
    const result = await this.twilioService.sendSMS(
      tenantId,
      body.to,
      body.body,
      body.fromNumberId,
    );
    
    // Increment SMS usage count if message was sent successfully
    if (result?.sid) {
      try {
        await this.tenantLimitsService.incrementSMSUsage(tenantId, 1);
      } catch (error) {
        console.error('Failed to increment SMS usage:', error);
      }
    }
    
    return result;
  }

  @Post('pools/:poolId')
  async updateNumberPool(
    @TenantId() tenantId: string,
    @Param('poolId') poolId: string,
    @Body() body: { name?: string; description?: string; maxMessagesPerDay?: number | null; isActive?: boolean },
  ) {
    return this.twilioService.updateNumberPool(tenantId, poolId, body);
  }

  @Post('numbers/:numberId')
  async updateNumber(
    @TenantId() tenantId: string,
    @Param('numberId') numberId: string,
    @Body() body: { maxMessagesPerDay?: number | null; friendlyName?: string },
  ) {
    return this.twilioService.updateNumber(tenantId, numberId, body);
  }

  @Post('numbers/:numberId/remove-pool')
  async removeNumberFromPool(
    @TenantId() tenantId: string,
    @Param('numberId') numberId: string,
  ) {
    return this.twilioService.removeNumberFromPool(tenantId, numberId);
  }

  @Post('pools/:poolId/delete')
  async deleteNumberPool(
    @TenantId() tenantId: string,
    @Param('poolId') poolId: string,
  ) {
    return this.twilioService.deleteNumberPool(tenantId, poolId);
  }

  @Post('test-connection')
  async testConnection(@TenantId() tenantId: string) {
    return this.twilioService.testConnection(tenantId);
  }

  @Post('update-webhooks')
  async updateWebhooks(@TenantId() tenantId: string) {
    return this.twilioService.updateAllWebhooks(tenantId);
  }

  @Get('verify-webhooks')
  async verifyWebhooks(@TenantId() tenantId: string) {
    return this.twilioService.verifyWebhooks(tenantId);
  }
}

