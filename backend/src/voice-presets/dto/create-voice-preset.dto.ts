import { IsString, IsOptional, IsNumber, IsBoolean, IsArray, Min, Max } from 'class-validator';

export class CreateVoicePresetDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  kokoroVoiceId: string;

  @IsString()
  @IsOptional()
  kokoroVoiceName?: string;

  @IsString()
  @IsOptional()
  customVoiceName?: string;

  @IsOptional()
  voiceConfig?: {
    stability?: number;
    similarityBoost?: number;
    style?: number;
    useSpeakerBoost?: boolean;
    speed?: number;
    speedVariance?: number;
    pitch?: number;
    volume?: number;
    pauseDuration?: number;
    emphasisStrength?: number;
    prosodyLevel?: number;
  };

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateVoicePresetDto extends CreateVoicePresetDto {}
