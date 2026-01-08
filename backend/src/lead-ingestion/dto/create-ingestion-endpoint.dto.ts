import {
  IsString,
  IsArray,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsObject,
  ValidateNested,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  IngestionActionType,
  IngestionAction,
  ParameterMapping,
} from '../../entities/lead-ingestion-endpoint.entity';

export class ParameterMappingDto {
  @IsString()
  @IsNotEmpty()
  paramName: string;

  @IsString()
  @IsNotEmpty()
  contactField: string;

  @IsBoolean()
  @IsOptional()
  required?: boolean;

  @IsOptional()
  defaultValue?: any;
}

export class IngestionActionDto {
  @IsEnum(IngestionActionType)
  type: IngestionActionType;

  @IsObject()
  config: {
    campaignId?: string;
    journeyId?: string;
    leadStatus?: string;
    [key: string]: any;
  };
}

export class CreateIngestionEndpointDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  endpointKey: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ParameterMappingDto)
  parameterMappings: ParameterMappingDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IngestionActionDto)
  actions: IngestionActionDto[];

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  @IsOptional()
  apiKey?: string;

  @IsObject()
  @IsOptional()
  metadata?: {
    ipWhitelist?: string[];
    rateLimit?: {
      requestsPerMinute?: number;
      requestsPerHour?: number;
    };
  };
}

