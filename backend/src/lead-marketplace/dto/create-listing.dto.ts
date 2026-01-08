import { IsString, IsNumber, IsOptional, IsObject, IsEnum, IsArray, Min } from 'class-validator';
import { ListingStatus } from '../entities/listing.entity';

export class CreateListingDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  industry?: string;

  @IsNumber()
  @Min(0.01)
  pricePerLead: number;

  @IsEnum(ListingStatus)
  @IsOptional()
  status?: ListingStatus;

  @IsObject()
  leadParameters: Record<string, any>; // Fields provided per lead

  @IsObject()
  @IsOptional()
  weightDistribution?: Record<string, any>; // Distribution rules

  @IsString()
  @IsOptional()
  campaignId?: string;

  @IsString()
  @IsOptional()
  adsetId?: string;

  @IsString()
  @IsOptional()
  adId?: string;
}

