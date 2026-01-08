import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantLimitsController } from './tenant-limits.controller';
import { TenantLimitsService } from './tenant-limits.service';
import { TenantLimits } from '../entities/tenant-limits.entity';
import { PricingPlan } from '../entities/pricing-plan.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TenantLimits, PricingPlan])],
  controllers: [TenantLimitsController],
  providers: [TenantLimitsService],
  exports: [TenantLimitsService],
})
export class TenantLimitsModule {}

