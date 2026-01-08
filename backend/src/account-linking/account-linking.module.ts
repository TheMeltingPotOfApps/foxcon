import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountLinkingService } from './account-linking.service';
import { AccountLinkingController } from './account-linking.controller';
import { AccountLink } from './entities/account-link.entity';
import { DataSharingPermission } from './entities/data-sharing-permission.entity';
import { User } from '../entities/user.entity';
import { Tenant } from '../entities/tenant.entity';
import { MarketplaceUser } from '../marketplace-auth/entities/marketplace-user.entity';
import { MarketplaceAuthModule } from '../marketplace-auth/marketplace-auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AccountLink,
      DataSharingPermission,
      User,
      Tenant,
      MarketplaceUser,
    ]),
    forwardRef(() => MarketplaceAuthModule),
  ],
  controllers: [AccountLinkingController],
  providers: [AccountLinkingService],
  exports: [AccountLinkingService],
})
export class AccountLinkingModule {}

