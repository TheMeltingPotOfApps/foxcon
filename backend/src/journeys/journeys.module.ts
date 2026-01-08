import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { JourneysController } from './journeys.controller';
import { JourneyWebhooksController } from './journey-webhooks.controller';
import { JourneysService } from './journeys.service';
import { JourneySchedulerService } from './journey-scheduler.service';
import { Journey } from '../entities/journey.entity';
import { JourneyNode } from '../entities/journey-node.entity';
import { JourneyContact } from '../entities/journey-contact.entity';
import { JourneyNodeExecution } from '../entities/journey-node-execution.entity';
import { Contact } from '../entities/contact.entity';
import { Campaign } from '../entities/campaign.entity';
import { CampaignContact } from '../entities/campaign-contact.entity';
import { Conversation } from '../entities/conversation.entity';
import { Message } from '../entities/message.entity';
import { TenantWebhook } from '../entities/tenant-webhook.entity';
import { Template } from '../entities/template.entity';
import { TemplateVersion } from '../entities/template-version.entity';
import { NumberPool } from '../entities/number-pool.entity';
import { TwilioNumber } from '../entities/twilio-number.entity';
import { ContentAiTemplate } from '../entities/content-ai-template.entity';
import { CallLog } from '../entities/call-log.entity';
import { AsteriskDid } from '../entities/asterisk-did.entity';
import { TwilioModule } from '../twilio/twilio.module';
import { ContentAiModule } from '../content-ai/content-ai.module';
import { AsteriskModule } from '../asterisk/asterisk.module';
import { Tcpamodule } from '../tcpa/tcpa.module';
import { VoiceMessagesModule } from '../voice-messages/voice-messages.module';
import { KokoroModule } from '../kokoro/kokoro.module';
import { AudioProcessingModule } from '../audio-processing/audio-processing.module';
import { VoiceTemplate } from '../entities/voice-template.entity';
import { GeneratedAudio } from '../entities/generated-audio.entity';
import { JourneyAudio } from '../entities/journey-audio.entity';
import { Tenant } from '../entities/tenant.entity';
import { ExecutionRulesModule } from '../execution-rules/execution-rules.module';
import { CalendarModule } from '../calendar/calendar.module';
import { TenantLimitsModule } from '../tenant-limits/tenant-limits.module';
import { CommonModule } from '../common/common.module';
import { AiGenerationModule } from '../ai/ai-generation.module';
import { LeadStatusesModule } from '../lead-statuses/lead-statuses.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([
      Journey,
      JourneyNode,
      JourneyContact,
      JourneyNodeExecution,
      Contact,
      Campaign,
      CampaignContact,
      Conversation,
      Message,
      TenantWebhook,
      Template,
      TemplateVersion,
      NumberPool,
      TwilioNumber,
      ContentAiTemplate,
      CallLog,
      AsteriskDid,
      VoiceTemplate,
      GeneratedAudio,
      JourneyAudio,
      Tenant,
    ]),
    TwilioModule,
    ContentAiModule,
    AsteriskModule,
    Tcpamodule,
    VoiceMessagesModule,
    KokoroModule,
    AudioProcessingModule,
    ExecutionRulesModule,
    forwardRef(() => CalendarModule),
    TenantLimitsModule,
    CommonModule,
    forwardRef(() => AiGenerationModule),
    LeadStatusesModule,
  ],
  controllers: [JourneysController, JourneyWebhooksController],
  providers: [JourneysService, JourneySchedulerService],
  exports: [JourneysService],
})
export class JourneysModule {}

