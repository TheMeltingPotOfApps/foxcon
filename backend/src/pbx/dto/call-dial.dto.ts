import { IsString, IsOptional, IsUUID } from 'class-validator';

export class DialCallDto {
  @IsString()
  phoneNumber: string;

  @IsOptional()
  @IsUUID()
  contactId?: string;
}

