import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { getDatabaseConfig } from '../config/database.config';
import { DatabaseHealthService } from './database-health.service';
import { Tenant } from '../entities/tenant.entity';
import { User } from '../entities/user.entity';
import { UserTenant } from '../entities/user-tenant.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import { TwilioConfig } from '../entities/twilio-config.entity';
import { TwilioNumber } from '../entities/twilio-number.entity';
import { NumberPool } from '../entities/number-pool.entity';
import { Contact } from '../entities/contact.entity';
import { ContactTag } from '../entities/contact-tag.entity';
import { Campaign } from '../entities/campaign.entity';
import { CampaignContact } from '../entities/campaign-contact.entity';
import { Segment } from '../entities/segment.entity';
import { Conversation } from '../entities/conversation.entity';
import { Message } from '../entities/message.entity';
import { Template } from '../entities/template.entity';
import { TemplateVersion } from '../entities/template-version.entity';
import { AIConfig } from '../entities/ai-config.entity';
import { Journey } from '../entities/journey.entity';
import { JourneyNode } from '../entities/journey-node.entity';
import { JourneyContact } from '../entities/journey-contact.entity';
import { JourneyNodeExecution } from '../entities/journey-node-execution.entity';
import { TenantWebhook } from '../entities/tenant-webhook.entity';
import { LeadIngestionEndpoint } from '../entities/lead-ingestion-endpoint.entity';
import { VoiceTemplate } from '../entities/voice-template.entity';
import { GeneratedAudio } from '../entities/generated-audio.entity';
import { VoiceMessage } from '../entities/voice-message.entity';
import { AudioCredits } from '../entities/audio-credits.entity';
import { SystemConfig } from '../entities/system-config.entity';
import { AiTemplate } from '../entities/ai-template.entity';
import { CallLog } from '../entities/call-log.entity';
import { AsteriskDid } from '../entities/asterisk-did.entity';
import { EventType } from '../entities/event-type.entity';
import { Availability } from '../entities/availability.entity';
import { CalendarEvent } from '../entities/calendar-event.entity';
import { Notification } from '../entities/notification.entity';
import { NotificationPreference } from '../entities/notification-preference.entity';
import { ContactVisit } from '../entities/contact-visit.entity';
import { OnboardingProgress } from '../entities/onboarding-progress.entity';
import { TenantLimits } from '../entities/tenant-limits.entity';
import { PricingPlan } from '../entities/pricing-plan.entity';
import { ContentAiTemplate } from '../entities/content-ai-template.entity';
import { JourneyAudio } from '../entities/journey-audio.entity';
import { LeadReservation } from '../lead-marketplace/entities/lead-reservation.entity';
import { LeadReservationTransaction } from '../lead-marketplace/entities/lead-reservation-transaction.entity';
import { LeadReservationExchangeRate } from '../lead-marketplace/entities/lead-reservation-exchange-rate.entity';
import { MarketplaceUser } from '../lead-marketplace/entities/marketplace-user.entity';
import { Listing } from '../lead-marketplace/entities/listing.entity';
import { ListingMetrics } from '../lead-marketplace/entities/listing-metrics.entity';
import { MarketplaceSubscription } from '../lead-marketplace/entities/subscription.entity';
import { LeadDistribution } from '../lead-marketplace/entities/lead-distribution.entity';
import { ListingReview } from '../lead-marketplace/entities/listing-review.entity';
import { MarketingPlatformIntegration } from '../lead-marketplace/entities/marketing-platform-integration.entity';
import { LeadSource } from '../lead-marketplace/entities/lead-source.entity';
import { MarketplaceCustomEndpoint } from '../lead-marketplace/entities/custom-endpoint.entity';
import { CrmIntegration } from '../entities/crm-integration.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const config = getDatabaseConfig(configService);
        // Test connection, but don't fail if DB is not available
        return config;
      },
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([
      Tenant,
      User,
      UserTenant,
      RefreshToken,
      TwilioConfig,
      TwilioNumber,
      NumberPool,
      Contact,
      ContactTag,
      Campaign,
      CampaignContact,
      Segment,
      Conversation,
      Message,
      Template,
      TemplateVersion,
      AIConfig,
      Journey,
      JourneyNode,
      JourneyContact,
      JourneyNodeExecution,
      TenantWebhook,
      LeadIngestionEndpoint,
      VoiceTemplate,
      GeneratedAudio,
      VoiceMessage,
      AudioCredits,
      SystemConfig,
      AiTemplate,
      CallLog,
      AsteriskDid,
      EventType,
      Availability,
      CalendarEvent,
      Notification,
      NotificationPreference,
      ContactVisit,
      OnboardingProgress,
      TenantLimits,
      PricingPlan,
      ContentAiTemplate,
      JourneyAudio,
      // Lead Marketplace entities
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
      CrmIntegration,
    ]),
  ],
  providers: [DatabaseHealthService],
  exports: [TypeOrmModule, DatabaseHealthService],
})
export class DatabaseModule {}
