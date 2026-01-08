import { IsString, IsArray, IsEnum, IsOptional, IsBoolean, IsObject, IsUrl } from 'class-validator';
import { WebhookEvent } from '../../entities/tenant-webhook.entity';

export class CreateWebhookDto {
  @IsUrl()
  url: string;

  @IsArray()
  @IsEnum(WebhookEvent, { each: true })
  events: WebhookEvent[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  secret?: string;

  @IsOptional()
  @IsObject()
  headers?: Record<string, string>;
}

