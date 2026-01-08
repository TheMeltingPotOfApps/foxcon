import { IsString, IsOptional, IsEnum, IsObject, IsBoolean, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { JourneyStatus } from '../../entities/journey.entity';

export class ScheduleConfigDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsArray()
  allowedDays?: number[];

  @IsOptional()
  @IsObject()
  allowedHours?: { start: number; end: number };

  @IsOptional()
  allowedMessagesPerDay?: number;
}

export class EntryCriteriaDto {
  @IsOptional()
  @IsArray()
  segmentIds?: string[];

  @IsOptional()
  @IsArray()
  tags?: string[];

  @IsOptional()
  @IsObject()
  attributes?: Record<string, any>;
}

export class RemovalCriteriaConditionConfigDto {
  @IsOptional()
  minDurationSeconds?: number;

  @IsOptional()
  @IsString()
  webhookUrl?: string;

  @IsOptional()
  @IsString()
  webhookPayloadField?: string;

  @IsOptional()
  @IsArray()
  callStatuses?: string[];

  @IsOptional()
  @IsObject()
  customCondition?: Record<string, any>;
}

export class RemovalCriteriaConditionDto {
  @IsString()
  type: 'call_transferred' | 'call_duration' | 'webhook' | 'call_status' | 'custom';

  @IsOptional()
  @ValidateNested()
  @Type(() => RemovalCriteriaConditionConfigDto)
  config?: RemovalCriteriaConditionConfigDto;
}

export class RemovalCriteriaDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RemovalCriteriaConditionDto)
  conditions?: RemovalCriteriaConditionDto[];
}

export class CreateJourneyDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(JourneyStatus)
  status?: JourneyStatus;

  @IsOptional()
  @ValidateNested()
  @Type(() => ScheduleConfigDto)
  scheduleConfig?: ScheduleConfigDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => EntryCriteriaDto)
  entryCriteria?: EntryCriteriaDto;

  @IsOptional()
  @IsBoolean()
  autoEnrollEnabled?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => RemovalCriteriaDto)
  removalCriteria?: RemovalCriteriaDto;
}

