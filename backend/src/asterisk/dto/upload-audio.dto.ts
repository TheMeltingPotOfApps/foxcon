import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class UploadAudioMetadataDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  addToFreePBX?: boolean;
}

