import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsObject,
  IsUUID,
  IsEnum,
  ValidateIf,
} from 'class-validator';
import { AutomationTriggerType, TimeUnit } from '../entities/status-automation.entity';

export class CreateStatusAutomationDto {
  @IsString()
  name: string;

  @IsEnum(AutomationTriggerType)
  triggerType: AutomationTriggerType;

  // For TIME_BASED triggers
  @ValidateIf((o) => o.triggerType === AutomationTriggerType.TIME_BASED)
  @IsOptional()
  @IsUUID()
  fromStatusId?: string;

  @ValidateIf((o) => o.triggerType === AutomationTriggerType.TIME_BASED)
  @IsOptional()
  @IsInt()
  timeValue?: number;

  @ValidateIf((o) => o.triggerType === AutomationTriggerType.TIME_BASED)
  @IsOptional()
  @IsEnum(TimeUnit)
  timeUnit?: TimeUnit;

  // For STATUS_CHANGE triggers
  @ValidateIf((o) => o.triggerType === AutomationTriggerType.STATUS_CHANGE)
  @IsOptional()
  @IsUUID()
  triggerStatusId?: string;

  // Target status
  @IsUUID()
  targetStatusId: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsObject()
  conditions?: {
    campaignIds?: string[];
    journeyIds?: string[];
    tags?: string[];
    [key: string]: any;
  };
}

export class UpdateStatusAutomationDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(AutomationTriggerType)
  triggerType?: AutomationTriggerType;

  @IsOptional()
  @IsUUID()
  fromStatusId?: string;

  @IsOptional()
  @IsInt()
  timeValue?: number;

  @IsOptional()
  @IsEnum(TimeUnit)
  timeUnit?: TimeUnit;

  @IsOptional()
  @IsUUID()
  triggerStatusId?: string;

  @IsOptional()
  @IsUUID()
  targetStatusId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsObject()
  conditions?: {
    campaignIds?: string[];
    journeyIds?: string[];
    tags?: string[];
    [key: string]: any;
  };
}

