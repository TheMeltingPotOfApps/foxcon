import { IsString, IsOptional, IsEnum } from 'class-validator';

export class MakeCallDto {
  @IsString()
  to: string;

  @IsString()
  from: string; // DID ID or tenant ID for rotation

  @IsOptional()
  @IsString()
  context?: string; // Optional dialplan context

  @IsOptional()
  @IsString()
  transferNumber?: string; // Transfer destination number

  @IsOptional()
  @IsString()
  ivrFile?: string; // IVR audio file path (without extension)

  @IsOptional()
  @IsString()
  ivrVmFile?: string; // Voicemail audio file path (without extension)

  @IsOptional()
  useTwilioFormat?: boolean; // If true, use +1 format for "to" number (Twilio requires this)
  
  @IsOptional()
  @IsString()
  didPoolType?: 'MC' | 'Twilio'; // DID pool type - determines which trunk to use
}

export class MakeCallResponseDto {
  success: boolean;
  callId?: string;
  asteriskUniqueId?: string;
  callDetails?: {
    brand?: {
      name?: string;
      phoneId?: string;
    };
    did?: {
      number?: string;
      usageCount?: number;
      maxUsage?: number;
      areaCode?: string;
    };
    to?: string;
    from?: string;
    transferNumber?: string;
    trunk?: string;
    context?: string;
  };
  amiResponse?: {
    success: boolean;
    uniqueId?: string;
    status?: string;
  };
  errorDetails?: {
    message?: string;
    asteriskResponse?: string;
    asteriskMessage?: string;
    asteriskReason?: string;
    asteriskChannel?: string;
    callParameters?: {
      to?: string;
      from?: string;
      transferNumber?: string;
      trunk?: string;
      context?: string;
      didId?: string;
    };
  };
  message?: string;
}

