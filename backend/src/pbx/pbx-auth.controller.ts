import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IsString, IsNotEmpty } from 'class-validator';
import { AgentExtension } from '../entities/agent-extension.entity';
import { User } from '../entities/user.entity';
import { UserTenant } from '../entities/user-tenant.entity';
import * as bcrypt from 'bcrypt';

export class PbxLoginDto {
  @IsString()
  @IsNotEmpty()
  extension: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

@Controller('pbx/auth')
export class PbxAuthController {
  constructor(
    @InjectRepository(AgentExtension)
    private agentExtensionRepository: Repository<AgentExtension>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserTenant)
    private userTenantRepository: Repository<UserTenant>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  @Post('login')
  async login(@Body() dto: PbxLoginDto) {
    const { extension, password } = dto;

    if (!extension || !password) {
      throw new BadRequestException('Extension and password are required');
    }

    // Find agent extension
    const agentExtension = await this.agentExtensionRepository.findOne({
      where: { extension },
      relations: ['user'],
    });

    if (!agentExtension) {
      throw new UnauthorizedException('Invalid extension or password');
    }

    if (!agentExtension.isActive) {
      throw new UnauthorizedException('Agent extension is not active');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(
      password,
      agentExtension.sipPassword,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid extension or password');
    }

    // Get user
    const user = await this.userRepository.findOne({
      where: { id: agentExtension.userId },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User account is not active');
    }

    // Get user role for this tenant
    const userTenant = await this.userTenantRepository.findOne({
      where: {
        userId: user.id,
        tenantId: agentExtension.tenantId,
        isActive: true,
      },
    });

    const userRole = userTenant?.role || 'AGENT';

    // Generate JWT token
    const payload = {
      sub: user.id,
      email: user.email,
      tenantId: agentExtension.tenantId,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: userRole,
      },
      tenantId: agentExtension.tenantId,
      agentExtension: {
        id: agentExtension.id,
        extension: agentExtension.extension,
        status: agentExtension.status,
      },
    };
  }
}

