import { IsString, IsOptional, IsArray, IsObject, IsBoolean } from 'class-validator';

export class CreateAiTemplateDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsObject()
  config: {
    purpose?: string[];
    productInfo?: string;
    serviceInfo?: string;
    qualificationGuidelines?: string;
    brandTonality?: string;
    welcomeMessage?: string;
    customInstructions?: string;
    businessName?: string;
  };

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

