import { IsUUID, IsOptional, IsObject, IsString } from 'class-validator';

export class EnrollContactDto {
  @IsUUID()
  contactId: string;

  @IsOptional()
  @IsString()
  enrollmentSource?: 'manual' | 'webhook' | 'segment' | 'campaign' | 'event_scheduled' | 'event_reminder';

  @IsOptional()
  @IsObject()
  enrollmentData?: Record<string, any>;
}

