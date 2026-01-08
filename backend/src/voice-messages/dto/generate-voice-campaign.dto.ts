import { IsUUID, IsString, IsOptional, IsObject } from 'class-validator';

export class GenerateVoiceCampaignDto {
  @IsUUID()
  campaignId: string;

  @IsUUID()
  segmentId: string;

  @IsUUID()
  voiceTemplateId: string;

  @IsOptional()
  @IsObject()
  variableMappings?: Record<string, string>; // Map template variables to contact fields
}

