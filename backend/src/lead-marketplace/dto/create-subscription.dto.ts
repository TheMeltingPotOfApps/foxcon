import { IsString, IsNumber, IsDate, IsOptional, IsObject, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSubscriptionDto {
  @IsString()
  listingId: string;

  @IsNumber()
  @Min(1)
  leadCount: number;

  @IsDate()
  @Type(() => Date)
  startDate: Date;

  @IsDate()
  @Type(() => Date)
  endDate: Date;

  @IsNumber()
  @IsOptional()
  @Min(0)
  priority?: number;

  @IsObject()
  @IsOptional()
  distributionSchedule?: Record<string, any>;
}

