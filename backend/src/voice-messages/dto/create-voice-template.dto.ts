import { IsString, IsOptional, IsObject, IsArray, IsBoolean, IsNumber, Min, Max } from 'class-validator';

export class CreateVoiceTemplateDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  messageContent: string;

  @IsOptional()
  @IsString()
  kokoroVoiceId?: string;

  @IsOptional()
  @IsString()
  kokoroVoiceName?: string;

  @IsOptional()
  @IsString()
  elevenLabsVoiceId?: string; // Legacy field for backward compatibility

  @IsOptional()
  @IsString()
  elevenLabsVoiceName?: string; // Legacy field for backward compatibility

  @IsOptional()
  @IsString()
  voicePresetId?: string;

  @IsOptional()
  @IsObject()
  voiceConfig?: {
    stability?: number;
    similarityBoost?: number;
    style?: number;
    useSpeakerBoost?: boolean;
    speed?: number;
    speedVariance?: number;
  };

  @IsOptional()
  @IsObject()
  audioEffects?: {
    distance?: 'close' | 'medium' | 'far';
    backgroundNoise?: {
      enabled: boolean;
      volume?: number;
      file?: string;
    };
    volume?: number;
    coughEffects?: Array<{
      file: 'stifled-cough' | 'coughing-woman' | 'coughing-woman-2';
      timestamp: number;
      volume?: number;
    }>;
  };

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

