import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PricingPlansController } from './pricing-plans.controller';
import { PricingPlansService } from './pricing-plans.service';
import { PricingPlan } from '../entities/pricing-plan.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PricingPlan])],
  controllers: [PricingPlansController],
  providers: [PricingPlansService],
  exports: [PricingPlansService],
})
export class PricingPlansModule {}

