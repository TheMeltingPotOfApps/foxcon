import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeadIngestionController, PublicIngestionController } from './lead-ingestion.controller';
import { LeadIngestionService } from './lead-ingestion.service';
import { LeadIngestionEndpoint } from '../entities/lead-ingestion-endpoint.entity';
import { Contact } from '../entities/contact.entity';
import { CampaignContact } from '../entities/campaign-contact.entity';
import { JourneyContact } from '../entities/journey-contact.entity';
import { Campaign } from '../entities/campaign.entity';
import { Journey } from '../entities/journey.entity';
import { JourneysModule } from '../journeys/journeys.module';
import { AiGenerationModule } from '../ai/ai-generation.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LeadIngestionEndpoint,
      Contact,
      CampaignContact,
      JourneyContact,
      Campaign,
      Journey,
    ]),
    JourneysModule,
    AiGenerationModule,
  ],
  controllers: [LeadIngestionController, PublicIngestionController],
  providers: [LeadIngestionService],
  exports: [LeadIngestionService],
})
export class LeadIngestionModule {}

