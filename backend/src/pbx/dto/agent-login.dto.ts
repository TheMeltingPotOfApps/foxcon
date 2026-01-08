import { IsString, IsNotEmpty } from 'class-validator';

export class AgentLoginDto {
  @IsString()
  @IsNotEmpty()
  extension: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

