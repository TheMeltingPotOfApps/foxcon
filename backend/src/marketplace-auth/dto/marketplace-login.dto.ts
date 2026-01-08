import { IsEmail, IsString } from 'class-validator';

export class MarketplaceLoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}

