import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillingController, BillingWebhookController } from './billing.controller';
import { BillingService } from './billing.service';
import { BillingUsageService } from './billing-usage.service';
import { Tenant } from '../entities/tenant.entity';
import { Subscription } from '../entities/subscription.entity';
import { Invoice } from '../entities/invoice.entity';
import { PaymentMethod } from '../entities/payment-method.entity';
import { BillingUsage } from '../entities/billing-usage.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tenant, Subscription, Invoice, PaymentMethod, BillingUsage]),
  ],
  controllers: [BillingController, BillingWebhookController],
  providers: [BillingService, BillingUsageService],
  exports: [BillingService, BillingUsageService],
})
export class BillingModule {}

