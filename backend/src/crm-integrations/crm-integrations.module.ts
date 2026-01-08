import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CrmIntegrationsService } from './crm-integrations.service';
import { CrmIntegrationsController } from './crm-integrations.controller';
import { MarketplaceCrmIntegrationsController } from './marketplace-crm-integrations.controller';
import { CrmIntegration } from '../entities/crm-integration.entity';
import { AccountLinkingModule } from '../account-linking/account-linking.module';
import { MarketplaceAuthModule } from '../marketplace-auth/marketplace-auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CrmIntegration]),
    forwardRef(() => AccountLinkingModule),
    forwardRef(() => MarketplaceAuthModule),
  ],
  controllers: [CrmIntegrationsController, MarketplaceCrmIntegrationsController],
  providers: [CrmIntegrationsService],
  exports: [CrmIntegrationsService],
})
export class CrmIntegrationsModule {}

