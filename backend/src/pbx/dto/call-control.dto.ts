import { IsString, IsOptional, IsBoolean, IsEnum } from 'class-validator';

export class AnswerCallDto {
  @IsString()
  callId: string;
}

export class HangupCallDto {
  @IsString()
  callId: string;
}

export class HoldCallDto {
  @IsString()
  callId: string;

  @IsBoolean()
  hold: boolean;
}

export class MuteCallDto {
  @IsString()
  callId: string;

  @IsBoolean()
  mute: boolean;
}

export class TransferCallDto {
  @IsString()
  callId: string;

  @IsString()
  target: string; // Extension or phone number

  @IsEnum(['blind', 'attended'])
  type: 'blind' | 'attended';
}

export class UpdateCallNotesDto {
  @IsString()
  callId: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  disposition?: string;
}

