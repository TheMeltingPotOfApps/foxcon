import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TwilioService } from './twilio.service';
import { TwilioController } from './twilio.controller';
import { TwilioConfig } from '../entities/twilio-config.entity';
import { TwilioNumber } from '../entities/twilio-number.entity';
import { NumberPool } from '../entities/number-pool.entity';
import { Tenant } from '../entities/tenant.entity';
import { TenantLimitsModule } from '../tenant-limits/tenant-limits.module';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TwilioConfig, TwilioNumber, NumberPool, Tenant]),
    TenantLimitsModule,
    BillingModule,
  ],
  controllers: [TwilioController],
  providers: [TwilioService],
  exports: [TwilioService],
})
export class TwilioModule {}

