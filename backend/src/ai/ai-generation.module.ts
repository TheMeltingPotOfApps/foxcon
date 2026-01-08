import { Module, forwardRef } from '@nestjs/common';
import { AiGenerationService } from './ai-generation.service';
import { AiGenerationController } from './ai-generation.controller';
import { AiEventCreationService } from './ai-event-creation.service';
import { IntegrationBuilderService } from './integration-builder.service';
import { IntegrationBuilderController } from './integration-builder.controller';
import { ConfigModule } from '../config/config.module';
import { EventTypesModule } from '../event-types/event-types.module';
import { CalendarModule } from '../calendar/calendar.module';

@Module({
  imports: [ConfigModule, EventTypesModule, forwardRef(() => CalendarModule)],
  controllers: [AiGenerationController, IntegrationBuilderController],
  providers: [AiGenerationService, AiEventCreationService, IntegrationBuilderService],
  exports: [AiGenerationService, AiEventCreationService, IntegrationBuilderService],
})
export class AiGenerationModule {}

