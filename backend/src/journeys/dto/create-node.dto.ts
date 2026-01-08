import { IsString, IsEnum, IsNumber, IsObject, IsOptional, IsUUID } from 'class-validator';
import { JourneyNodeType, TimeDelayUnit } from '../../entities/journey-node.entity';

export class CreateJourneyNodeDto {
  @IsEnum(JourneyNodeType)
  type: JourneyNodeType;

  @IsNumber()
  positionX: number;

  @IsNumber()
  positionY: number;

  @IsOptional()
  @IsObject()
  config?: {
    messageContent?: string;
    templateId?: string;
    contentAiTemplateId?: string;
    numberPoolId?: string;
    eventTypeId?: string; // Event type ID for calendar booking link
    campaignId?: string;
    webhookId?: string;
    webhookUrl?: string;
    webhookMethod?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    webhookHeaders?: Record<string, string>;
    webhookBody?: string;
    webhookRetries?: number;
    webhookRetryDelay?: number;
    webhookTimeout?: number;
    webhookResponseHandling?: {
      successField?: string;
      errorField?: string;
      extractFields?: string[];
    };
    delayValue?: number;
    delayUnit?: TimeDelayUnit;
    delayAtTime?: string;
    voiceMessageUrl?: string;
    voiceTemplateId?: string;
    audioFile?: string; // Asterisk audio file name (ivr_file)
    didPoolType?: 'MC' | 'Twilio'; // DID pool type - determines which trunk to use (MC or Twilio)
    didId?: string; // Specific Asterisk DID ID
    didSegment?: string; // DID segment name (e.g., "twilio-main") - selects from segment if didId not specified
    transferNumber?: string; // Transfer destination number
    enableVmFile?: boolean; // Enable voicemail file (ivr_vm_file)
    recordCall?: boolean;
    branches?: Array<{
      id: string;
      label: string;
      condition: {
        field: string;
        operator: 'equals' | 'contains' | 'not_equals' | 'greater_than' | 'less_than' | 'exists' | 'not_exists';
        value?: any;
        campaignId?: string;
      };
      nextNodeId?: string;
    }>;
    defaultBranch?: {
      nextNodeId?: string;
    };
    paths?: Array<{
      id: string;
      label: string;
      percentage: number;
      nextNodeId?: string;
    }>;
    leadStatus?: string;
  };

  @IsOptional()
  @IsObject()
  connections?: {
    nextNodeId?: string;
    conditions?: Array<{
      field: string;
      operator: string;
      value: any;
    }>;
    outputs?: Record<string, string>;
  };
}

