import { IsString, IsNumber, IsOptional, IsEnum } from 'class-validator';
import { PlanType } from '../../entities/subscription.entity';

export class UpdatePricingDto {
  @IsEnum(PlanType)
  planType: PlanType;

  @IsString()
  @IsOptional()
  stripePriceId?: string;

  @IsNumber()
  @IsOptional()
  monthlyPrice?: number; // in dollars

  @IsNumber()
  @IsOptional()
  yearlyPrice?: number; // in dollars
}

export class CreateStripePriceDto {
  @IsEnum(PlanType)
  planType: PlanType;

  @IsNumber()
  amount: number; // in dollars

  @IsString()
  currency?: string; // defaults to 'usd'

  @IsString()
  interval: 'month' | 'year';
}

