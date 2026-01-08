import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { User } from '../entities/user.entity';
import { UserTenant } from '../entities/user-tenant.entity';
import { Tenant } from '../entities/tenant.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import { TenantLimitsModule } from '../tenant-limits/tenant-limits.module';
import { LeadStatusesModule } from '../lead-statuses/lead-statuses.module';
import { AccountLinkingModule } from '../account-linking/account-linking.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserTenant, Tenant, RefreshToken]),
    forwardRef(() => TenantLimitsModule),
    forwardRef(() => LeadStatusesModule),
    forwardRef(() => AccountLinkingModule),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const expiresIn = configService.get<string>('JWT_EXPIRES_IN', '15m');
        return {
          secret: configService.get<string>('JWT_SECRET'),
          signOptions: {
            expiresIn: expiresIn as any,
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}

