import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MarketplaceAuthService } from './marketplace-auth.service';
import { MarketplaceAuthController } from './marketplace-auth.controller';
import { MarketplaceUser } from './entities/marketplace-user.entity';
import { MarketplaceRefreshToken } from './entities/marketplace-refresh-token.entity';
import { MarketplaceAuthGuard } from './guards/marketplace-auth.guard';
import { AccountLinkingModule } from '../account-linking/account-linking.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MarketplaceUser, MarketplaceRefreshToken]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'your-secret-key',
        signOptions: { expiresIn: '15m' },
      }),
      inject: [ConfigService],
    }),
    forwardRef(() => AccountLinkingModule),
  ],
  controllers: [MarketplaceAuthController],
  providers: [MarketplaceAuthService, MarketplaceAuthGuard],
  exports: [MarketplaceAuthService, MarketplaceAuthGuard, JwtModule],
})
export class MarketplaceAuthModule {}

