import { IsString, IsObject, IsOptional } from 'class-validator';

export class DistributeLeadDto {
  @IsString()
  listingId: string;

  @IsObject()
  contactData: {
    phoneNumber: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    attributes?: Record<string, any>;
  };

  @IsObject()
  @IsOptional()
  metadata?: {
    campaignId?: string;
    adsetId?: string;
    adId?: string;
    brand?: string;
    source?: string;
    industry?: string;
  };
}

