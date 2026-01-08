import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CampaignsController } from './campaigns.controller';
import { CampaignsService } from './campaigns.service';
import { Campaign } from '../entities/campaign.entity';
import { CampaignContact } from '../entities/campaign-contact.entity';
import { Contact } from '../entities/contact.entity';
import { NumberPool } from '../entities/number-pool.entity';
import { TwilioModule } from '../twilio/twilio.module';
import { SegmentsModule } from '../segments/segments.module';
import { TemplatesModule } from '../templates/templates.module';
import { ContentAiModule } from '../content-ai/content-ai.module';
import { CalendarModule } from '../calendar/calendar.module';
import { TenantLimitsModule } from '../tenant-limits/tenant-limits.module';
import { Segment } from '../entities/segment.entity';
import { Template } from '../entities/template.entity';
import { TemplateVersion } from '../entities/template-version.entity';
import { ContentAiTemplate } from '../entities/content-ai-template.entity';
import { Conversation } from '../entities/conversation.entity';
import { Message } from '../entities/message.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Campaign, CampaignContact, Contact, NumberPool, Segment, Template, TemplateVersion, ContentAiTemplate, Conversation, Message]),
    TwilioModule,
    SegmentsModule,
    TemplatesModule,
    ContentAiModule,
    CalendarModule,
    TenantLimitsModule,
  ],
  controllers: [CampaignsController],
  providers: [CampaignsService],
  exports: [CampaignsService],
})
export class CampaignsModule {}

