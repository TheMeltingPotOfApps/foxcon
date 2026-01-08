import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserTenant } from '../../entities/user-tenant.entity';

export interface JwtPayload {
  sub: string;
  email: string;
  tenantId: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private configService: ConfigService,
    @InjectRepository(UserTenant)
    private userTenantRepository: Repository<UserTenant>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    if (!payload.sub || !payload.tenantId) {
      this.logger.warn('Invalid token payload', {
        hasSub: !!payload.sub,
        hasTenantId: !!payload.tenantId,
        payloadKeys: Object.keys(payload),
      });
      throw new UnauthorizedException('Invalid token payload: missing sub or tenantId');
    }

    // Fetch user's role for this tenant
    const userTenant = await this.userTenantRepository.findOne({
      where: {
        userId: payload.sub,
        tenantId: payload.tenantId,
        isActive: true,
      },
    });

    if (!userTenant) {
      this.logger.warn('User tenant relationship not found', {
        userId: payload.sub,
        tenantId: payload.tenantId,
        email: payload.email,
      });
      throw new UnauthorizedException(`User tenant relationship not found for user ${payload.sub} and tenant ${payload.tenantId}`);
    }

    return {
      userId: payload.sub,
      email: payload.email,
      tenantId: payload.tenantId,
      role: userTenant.role,
    };
  }
}

