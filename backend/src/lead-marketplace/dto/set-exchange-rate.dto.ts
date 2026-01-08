import { IsNumber, IsOptional, IsDate, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class SetExchangeRateDto {
  @IsNumber()
  @Min(0.0001)
  rate: number; // Lead Reservations per USD

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  effectiveFrom?: Date;
}

