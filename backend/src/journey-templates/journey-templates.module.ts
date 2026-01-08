import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JourneyTemplatesService } from './journey-templates.service';
import { JourneyTemplatesController } from './journey-templates.controller';
import { SeedTemplatesService } from './seed-templates.service';
import { JourneyTemplate } from '../entities/journey-template.entity';
import { JourneyTemplateGenerationJob } from '../entities/journey-template-generation-job.entity';
import { Tenant } from '../entities/tenant.entity';
import { VoiceTemplate } from '../entities/voice-template.entity';
import { JourneysModule } from '../journeys/journeys.module';
import { AiGenerationModule } from '../ai/ai-generation.module';
import { ConfigModule } from '../config/config.module';
import { VoicePresetsModule } from '../voice-presets/voice-presets.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([JourneyTemplate, JourneyTemplateGenerationJob, Tenant, VoiceTemplate]),
    JourneysModule,
    AiGenerationModule,
    ConfigModule,
    VoicePresetsModule,
  ],
  providers: [JourneyTemplatesService, SeedTemplatesService],
  controllers: [JourneyTemplatesController],
  exports: [JourneyTemplatesService],
})
export class JourneyTemplatesModule {}

