import { IsString, IsOptional, IsBoolean, IsUUID, IsObject } from 'class-validator';

export class CreateAgentExtensionDto {
  @IsUUID()
  userId: string;

  @IsString()
  extension: string;

  @IsString()
  sipPassword: string;

  @IsOptional()
  @IsObject()
  settings?: {
    ringTone?: string;
    autoAnswer?: boolean;
    wrapUpTime?: number;
    maxConcurrentCalls?: number;
  };
}

export class UpdateAgentExtensionDto {
  @IsOptional()
  @IsString()
  sipPassword?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsObject()
  settings?: {
    ringTone?: string;
    autoAnswer?: boolean;
    wrapUpTime?: number;
    maxConcurrentCalls?: number;
  };
}

