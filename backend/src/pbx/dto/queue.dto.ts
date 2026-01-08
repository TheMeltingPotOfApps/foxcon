import { IsString, IsOptional, IsBoolean, IsArray, IsUUID } from 'class-validator';

export class CreateQueueDto {
  @IsString()
  name: string;

  @IsString()
  queueNumber: string;

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  agentIds?: string[];

  @IsOptional()
  settings?: {
    ringStrategy?: 'ringall' | 'leastrecent' | 'fewestcalls' | 'random';
    timeout?: number;
    maxWaitTime?: number;
    holdMusic?: string;
  };
}

export class UpdateQueueDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  agentIds?: string[];

  @IsOptional()
  settings?: {
    ringStrategy?: 'ringall' | 'leastrecent' | 'fewestcalls' | 'random';
    timeout?: number;
    maxWaitTime?: number;
    holdMusic?: string;
  };
}

