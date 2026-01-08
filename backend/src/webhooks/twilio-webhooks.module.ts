import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TwilioWebhooksController } from './twilio-webhooks.controller';
import { TwilioWebhooksService } from './twilio-webhooks.service';
import { TwilioModule } from '../twilio/twilio.module';
import { AiTemplatesModule } from '../ai-templates/ai-templates.module';
import { AiGenerationModule } from '../ai/ai-generation.module';
import { EventTypesModule } from '../event-types/event-types.module';
import { CalendarModule } from '../calendar/calendar.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { TenantLimitsModule } from '../tenant-limits/tenant-limits.module';
import { Contact } from '../entities/contact.entity';
import { Conversation } from '../entities/conversation.entity';
import { Message, MessageDirection, MessageStatus } from '../entities/message.entity';
import { TwilioNumber } from '../entities/twilio-number.entity';
import { Campaign } from '../entities/campaign.entity';
import { CampaignContact } from '../entities/campaign-contact.entity';
import { JourneyContact } from '../entities/journey-contact.entity';
import { AiTemplate } from '../entities/ai-template.entity';
import { UserTenant } from '../entities/user-tenant.entity';

@Module({
  imports: [
    TwilioModule,
    AiTemplatesModule,
    AiGenerationModule,
    EventTypesModule,
    CalendarModule,
    NotificationsModule,
    TenantLimitsModule,
    TypeOrmModule.forFeature([Contact, Conversation, Message, TwilioNumber, Campaign, CampaignContact, JourneyContact, AiTemplate, UserTenant]),
  ],
  controllers: [TwilioWebhooksController],
  providers: [TwilioWebhooksService],
})
export class TwilioWebhooksModule {}

