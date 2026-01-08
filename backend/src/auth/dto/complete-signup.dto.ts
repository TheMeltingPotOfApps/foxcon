import { IsString, IsEmail, MinLength } from 'class-validator';

export class CompleteSignupDto {
  @IsEmail()
  email: string;

  @IsString()
  token: string;

  @IsString()
  @MinLength(8)
  password: string;
}

