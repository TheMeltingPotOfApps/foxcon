import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  RawBodyRequest,
} from '@nestjs/common';
import { BillingService } from './billing.service';
import { BillingUsageService } from './billing-usage.service';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';
import { CreatePortalSessionDto } from './dto/create-portal-session.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { Query, Param } from '@nestjs/common';
import Stripe from 'stripe';

@Controller('billing')
@UseGuards(JwtAuthGuard, TenantGuard)
export class BillingController {
  constructor(
    private readonly billingService: BillingService,
    private readonly billingUsageService: BillingUsageService,
  ) {}

  @Post('checkout')
  async createCheckoutSession(
    @TenantId() tenantId: string,
    @Body() dto: CreateCheckoutSessionDto,
  ) {
    return this.billingService.createCheckoutSession(
      tenantId,
      dto.planType,
      dto.successUrl,
      dto.cancelUrl,
    );
  }

  @Post('portal')
  async createPortalSession(
    @TenantId() tenantId: string,
    @Body() dto: CreatePortalSessionDto,
  ) {
    return this.billingService.createPortalSession(tenantId, dto.returnUrl);
  }

  @Get('subscription')
  async getSubscription(@TenantId() tenantId: string) {
    return this.billingService.getSubscription(tenantId);
  }

  @Get('invoices')
  async getInvoices(@TenantId() tenantId: string) {
    return this.billingService.getInvoices(tenantId);
  }

  @Get('payment-methods')
  async getPaymentMethods(@TenantId() tenantId: string) {
    return this.billingService.getPaymentMethods(tenantId);
  }

  @Post('subscription/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelSubscription(
    @TenantId() tenantId: string,
    @Body() body: { cancelAtPeriodEnd?: boolean },
  ) {
    return this.billingService.cancelSubscription(tenantId, body.cancelAtPeriodEnd ?? true);
  }

  @Get('usage')
  async getUsage(
    @TenantId() tenantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.billingUsageService.getUsageSummary(tenantId, start, end);
  }

  @Get('usage/:usageType')
  async getUsageByType(
    @TenantId() tenantId: string,
    @Param('usageType') usageType: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.billingUsageService.getUsageByType(tenantId, usageType as any, start, end);
  }

  @Post('usage/sync')
  @HttpCode(HttpStatus.OK)
  async syncUsageToStripe(
    @TenantId() tenantId: string,
    @Body() body: { usageType?: string; startDate?: string; endDate?: string },
  ) {
    const start = body.startDate ? new Date(body.startDate) : undefined;
    const end = body.endDate ? new Date(body.endDate) : undefined;
    const count = await this.billingUsageService.syncUsageToStripe(
      tenantId,
      body.usageType as any,
      start,
      end,
    );
    return { synced: count };
  }
}

@Controller('billing/webhook')
export class BillingWebhookController {
  constructor(private readonly billingService: BillingService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Req() req: RawBodyRequest<Request>) {
    const signature = req.headers['stripe-signature'] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!signature || !webhookSecret) {
      return { received: false };
    }

    // Get Stripe instance from service
    const stripe = (this.billingService as any).stripe as Stripe | undefined;
    if (!stripe) {
      return { received: false, error: 'Stripe not configured' };
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(req.rawBody, signature, webhookSecret);
    } catch (err: any) {
      return { received: false, error: err.message };
    }

    await this.billingService.handleWebhook(event);
    return { received: true };
  }
}

