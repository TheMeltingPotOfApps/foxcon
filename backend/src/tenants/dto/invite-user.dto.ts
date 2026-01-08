import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { UserRole } from '../../entities/user-role.enum';

export class InviteUserDto {
  @IsEmail()
  email: string;

  @IsEnum(UserRole)
  role: UserRole;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsString()
  phoneNumber: string; // Phone number for SMS invitation
}

export class UpdateUserRoleDto {
  @IsEnum(UserRole)
  role: UserRole;
}
