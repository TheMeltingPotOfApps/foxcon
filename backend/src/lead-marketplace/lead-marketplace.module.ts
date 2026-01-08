import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeadReservation } from './entities/lead-reservation.entity';
import { LeadReservationTransaction } from './entities/lead-reservation-transaction.entity';
import { LeadReservationExchangeRate } from './entities/lead-reservation-exchange-rate.entity';
import { MarketplaceUser } from './entities/marketplace-user.entity';
import { Listing } from './entities/listing.entity';
import { ListingMetrics } from './entities/listing-metrics.entity';
import { MarketplaceSubscription } from './entities/subscription.entity';
import { LeadDistribution } from './entities/lead-distribution.entity';
import { ListingReview } from './entities/listing-review.entity';
import { MarketingPlatformIntegration } from './entities/marketing-platform-integration.entity';
import { LeadSource } from './entities/lead-source.entity';
import { MarketplaceCustomEndpoint } from './entities/custom-endpoint.entity';
import { User } from '../entities/user.entity';
import { LeadReservationService } from './services/lead-reservation.service';
import { ListingService } from './services/listing.service';
import { SubscriptionService } from './services/subscription.service';
import { LeadDistributionService } from './services/lead-distribution.service';
import { MarketplaceAnalyticsService } from './services/marketplace-analytics.service';
import { EngineSyncService } from './services/engine-sync.service';
import { MarketingIntegrationService } from './services/marketing-integration.service';
import { RabbitMQDistributionService } from './services/rabbitmq-distribution.service';
import { RabbitMQMetricsService } from './services/rabbitmq-metrics.service';
import { CustomEndpointService } from './services/custom-endpoint.service';
import { CustomEndpointController } from './controllers/custom-endpoint.controller';
import { CampaignLinkingService } from './services/campaign-linking.service';
import { CampaignLinkingController } from './controllers/campaign-linking.controller';
import { RabbitMQModule } from '../rabbitmq/rabbitmq.module';
import { Campaign } from '../entities/campaign.entity';
import { Contact } from '../entities/contact.entity';
import { UserTenant } from '../entities/user-tenant.entity';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { LeadReservationController } from './controllers/lead-reservation.controller';
import { ListingController } from './controllers/listing.controller';
import { SubscriptionController } from './controllers/subscription.controller';
import { MarketplaceAdminController } from './controllers/marketplace-admin.controller';
import { MarketingIntegrationController } from './controllers/marketing-integration.controller';
import { StorefrontController } from './controllers/storefront.controller';
import { AnalyticsController } from './controllers/analytics.controller';
import { MarketplaceIngestionController } from './controllers/marketplace-ingestion.controller';
import { MarketplaceOnboardingProgress } from './entities/marketplace-onboarding-progress.entity';
import { MarketplaceOnboardingService } from './services/marketplace-onboarding.service';
import { MarketplaceOnboardingController } from './controllers/marketplace-onboarding.controller';
import { ListingReviewService } from './services/listing-review.service';
import { ListingReviewController } from './controllers/listing-review.controller';
import { MarketplaceUserRegistrationService } from './services/marketplace-user-registration.service';
import { MarketplaceUserRegistrationController } from './controllers/marketplace-user-registration.controller';
import { MarketplaceAdminAnalyticsService } from './services/marketplace-admin-analytics.service';
import { StorefrontManagementService } from './services/storefront-management.service';
import { StorefrontManagementController } from './controllers/storefront-management.controller';
import { LeadQualityService } from './services/lead-quality.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LeadReservation,
      LeadReservationTransaction,
      LeadReservationExchangeRate,
      MarketplaceUser,
      Listing,
      ListingMetrics,
      MarketplaceSubscription,
      LeadDistribution,
      ListingReview,
      MarketingPlatformIntegration,
      LeadSource,
      MarketplaceCustomEndpoint,
      MarketplaceOnboardingProgress,
      Campaign,
      Contact,
      User,
      UserTenant,
    ]),
    EventEmitterModule,
    RabbitMQModule,
  ],
  controllers: [
    LeadReservationController,
    ListingController,
    SubscriptionController,
    MarketplaceAdminController,
    MarketingIntegrationController,
    StorefrontController,
    AnalyticsController,
    MarketplaceIngestionController,
    CustomEndpointController,
    CampaignLinkingController,
    MarketplaceOnboardingController,
    ListingReviewController,
    MarketplaceUserRegistrationController,
    StorefrontManagementController,
  ],
  providers: [
    LeadReservationService,
    ListingService,
    SubscriptionService,
    MarketplaceAnalyticsService,
    MarketplaceAdminAnalyticsService,
    EngineSyncService,
    MarketingIntegrationService,
    LeadDistributionService,
    RabbitMQDistributionService,
    RabbitMQMetricsService,
    CustomEndpointService,
    CampaignLinkingService,
    MarketplaceOnboardingService,
    ListingReviewService,
    MarketplaceUserRegistrationService,
    StorefrontManagementService,
    LeadQualityService,
  ],
  exports: [
    LeadReservationService,
    ListingService,
    SubscriptionService,
    LeadDistributionService,
    MarketplaceAnalyticsService,
    MarketplaceAdminAnalyticsService,
    EngineSyncService,
    MarketingIntegrationService,
    MarketplaceOnboardingService,
    ListingReviewService,
    MarketplaceUserRegistrationService,
    StorefrontManagementService,
    LeadQualityService,
  ],
})
export class LeadMarketplaceModule {}

