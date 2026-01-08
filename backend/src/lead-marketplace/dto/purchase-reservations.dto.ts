import { IsNumber, IsOptional, IsObject, Min } from 'class-validator';

export class PurchaseReservationsDto {
  @IsNumber()
  @Min(0.01)
  usdAmount: number;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

