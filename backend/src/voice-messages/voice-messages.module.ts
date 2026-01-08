import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VoiceMessagesService } from './voice-messages.service';
import { VoiceMessagesController } from './voice-messages.controller';
import { VoiceTemplate } from '../entities/voice-template.entity';
import { GeneratedAudio } from '../entities/generated-audio.entity';
import { VoiceMessage } from '../entities/voice-message.entity';
import { AudioCredits } from '../entities/audio-credits.entity';
import { Contact } from '../entities/contact.entity';
import { Campaign } from '../entities/campaign.entity';
import { Segment } from '../entities/segment.entity';
import { Tenant } from '../entities/tenant.entity';
import { KokoroModule } from '../kokoro/kokoro.module';
import { AsteriskModule } from '../asterisk/asterisk.module';
import { VoicePresetsModule } from '../voice-presets/voice-presets.module';
import { AudioProcessingModule } from '../audio-processing/audio-processing.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      VoiceTemplate,
      GeneratedAudio,
      VoiceMessage,
      AudioCredits,
      Contact,
      Campaign,
      Segment,
      Tenant,
    ]),
    KokoroModule,
    AsteriskModule,
    VoicePresetsModule,
    AudioProcessingModule,
  ],
  controllers: [VoiceMessagesController],
  providers: [VoiceMessagesService],
  exports: [VoiceMessagesService],
})
export class VoiceMessagesModule {}

