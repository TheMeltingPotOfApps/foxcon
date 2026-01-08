import { IsEmail, IsString, MinLength, IsOptional, IsEnum } from 'class-validator';
import { MarketplaceUserType } from '../entities/marketplace-user.entity';

export class MarketplaceSignupDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsEnum(MarketplaceUserType)
  userType: MarketplaceUserType;

  @IsString()
  @IsOptional()
  companyName?: string;

  @IsString()
  @IsOptional()
  storefrontSlug?: string;
}

