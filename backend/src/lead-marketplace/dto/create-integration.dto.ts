import { IsString, IsOptional, IsObject, IsEnum } from 'class-validator';
import { MarketingPlatform } from '../entities/marketing-platform-integration.entity';

export class CreateIntegrationDto {
  @IsEnum(MarketingPlatform)
  platform: MarketingPlatform;

  @IsString()
  accessToken: string;

  @IsString()
  @IsOptional()
  refreshToken?: string;

  @IsString()
  @IsOptional()
  platformAccountId?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

