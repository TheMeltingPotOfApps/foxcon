import { IsString, IsOptional, IsBoolean, IsEnum, IsEmail } from 'class-validator';
import { UserRole } from '../../entities/user-role.enum';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;

  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsString()
  tenantId: string; // Tenant to add user to

  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole; // Defaults to VIEWER
}

export class UpdateUserDto {
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  @IsOptional()
  timezone?: string;
}

export class ChangeUserRoleDto {
  @IsString()
  tenantId: string; // Tenant context

  @IsEnum(UserRole)
  role: UserRole;
}

export class AssignUserToTenantDto {
  @IsString()
  tenantId: string;

  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;
}

