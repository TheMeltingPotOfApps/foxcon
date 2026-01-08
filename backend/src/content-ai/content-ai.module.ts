import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContentAiTemplate } from '../entities/content-ai-template.entity';
import { ContentAiService } from './content-ai.service';
import { ContentAiController } from './content-ai.controller';
import { AiGenerationModule } from '../ai/ai-generation.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ContentAiTemplate]),
    forwardRef(() => AiGenerationModule),
  ],
  controllers: [ContentAiController],
  providers: [ContentAiService],
  exports: [ContentAiService],
})
export class ContentAiModule {}

