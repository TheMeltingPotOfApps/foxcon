import { IsString, IsOptional, IsObject, IsEmail, IsUUID, IsArray } from 'class-validator';

export class WebhookLeadDto {
  @IsString()
  phoneNumber: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsObject()
  attributes?: Record<string, any>;

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  autoEnrollJourneyIds?: string[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

