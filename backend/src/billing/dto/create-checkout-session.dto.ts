import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PlanType } from '../../entities/subscription.entity';

export class CreateCheckoutSessionDto {
  @IsEnum(PlanType)
  planType: PlanType;

  @IsOptional()
  @IsString()
  successUrl?: string;

  @IsOptional()
  @IsString()
  cancelUrl?: string;
}

