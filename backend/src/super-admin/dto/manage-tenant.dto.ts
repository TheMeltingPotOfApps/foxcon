import { IsString, IsOptional, IsBoolean, IsEnum, IsObject } from 'class-validator';
import { PlanType } from '../../entities/subscription.entity';

export class CreateTenantDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsString()
  @IsOptional()
  timezone?: string;

  @IsEnum(PlanType)
  @IsOptional()
  planType?: PlanType;

  @IsString()
  @IsOptional()
  ownerEmail?: string; // Email of user to make owner

  @IsString()
  @IsOptional()
  ownerPassword?: string; // Password for new owner user
}

export class UpdateTenantDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsString()
  @IsOptional()
  timezone?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsObject()
  @IsOptional()
  billing?: {
    planType?: string;
    trialEndsAt?: Date;
  };
}

export class ChangeTenantPlanDto {
  @IsEnum(PlanType)
  planType: PlanType;

  @IsBoolean()
  @IsOptional()
  prorate?: boolean; // Whether to prorate the subscription change
}

