// Ensure crypto is available before any imports
if (typeof globalThis.crypto === 'undefined') {
  const crypto = require('crypto');
  if (typeof crypto.randomUUID === 'function') {
    globalThis.crypto = crypto as any;
  }
}

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis/redis.module';
import { RabbitMQModule } from './rabbitmq/rabbitmq.module';
import { AuthModule } from './auth/auth.module';
import { TenantsModule } from './tenants/tenants.module';
import { TwilioModule } from './twilio/twilio.module';
import { TwilioWebhooksModule } from './webhooks/twilio-webhooks.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { ContactsModule } from './contacts/contacts.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { JourneysModule } from './journeys/journeys.module';
import { LeadIngestionModule } from './lead-ingestion/lead-ingestion.module';
import { VoiceMessagesModule } from './voice-messages/voice-messages.module';
import { SegmentsModule } from './segments/segments.module';
import { ConfigModule as AppConfigModule } from './config/config.module';
import { AiTemplatesModule } from './ai-templates/ai-templates.module';
import { AiGenerationModule } from './ai/ai-generation.module';
import { TemplatesModule } from './templates/templates.module';
import { ContentAiModule } from './content-ai/content-ai.module';
import { ConversationsModule } from './conversations/conversations.module';
import { TenantInterceptor } from './common/interceptors/tenant.interceptor';
import { getLoggerConfig } from './config/logger.config';
import { AsteriskModule } from './asterisk/asterisk.module';
import { Tcpamodule } from './tcpa/tcpa.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { PbxModule } from './pbx/pbx.module';
import { BillingModule } from './billing/billing.module';
import { CalendarModule } from './calendar/calendar.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { SuperAdminModule } from './super-admin/super-admin.module';
import { JourneyTemplatesModule } from './journey-templates/journey-templates.module';
import { EventTypesModule } from './event-types/event-types.module';
import { AvailabilityModule } from './availability/availability.module';
import { NotificationsModule } from './notifications/notifications.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { TenantLimitsModule } from './tenant-limits/tenant-limits.module';
import { PricingPlansModule } from './pricing-plans/pricing-plans.module';
import { SetupModule } from './setup/setup.module';
import { ComplianceModule } from './compliance/compliance.module';
import { ExecutionRulesModule } from './execution-rules/execution-rules.module';
import { VoicePresetsModule } from './voice-presets/voice-presets.module';
import { ImessageModule } from './imessage/imessage.module';
import { UploadsModule } from './uploads/uploads.module';
import { LeadMarketplaceModule } from './lead-marketplace/lead-marketplace.module';
import { MarketplaceAuthModule } from './marketplace-auth/marketplace-auth.module';
import { AccountLinkingModule } from './account-linking/account-linking.module';
import { LeadStatusesModule } from './lead-statuses/lead-statuses.module';
import { CrmIntegrationsModule } from './crm-integrations/crm-integrations.module';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    WinstonModule.forRoot(getLoggerConfig()),
    EventEmitterModule.forRoot(),
    AppConfigModule,
    DatabaseModule,
    RedisModule,
    RabbitMQModule,
    AuthModule,
    TenantsModule,
    TwilioModule,
    TwilioWebhooksModule,
    WebhooksModule,
    ContactsModule,
    CampaignsModule,
    JourneysModule,
    LeadIngestionModule,
    VoiceMessagesModule,
    SegmentsModule,
    AiTemplatesModule,
    AiGenerationModule,
    TemplatesModule,
    ContentAiModule,
    ConversationsModule,
    AsteriskModule,
    Tcpamodule,
    DashboardModule,
    PbxModule,
    BillingModule,
    CalendarModule,
    AnalyticsModule,
    SuperAdminModule,
    JourneyTemplatesModule,
    EventTypesModule,
    AvailabilityModule,
    NotificationsModule,
    OnboardingModule,
    TenantLimitsModule,
    PricingPlansModule,
    SetupModule,
    ComplianceModule,
    ExecutionRulesModule,
    VoicePresetsModule,
    ImessageModule,
    UploadsModule,
    LeadMarketplaceModule,
    MarketplaceAuthModule,
    AccountLinkingModule,
    LeadStatusesModule,
    CrmIntegrationsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantInterceptor,
    },
  ],
})
export class AppModule {}

