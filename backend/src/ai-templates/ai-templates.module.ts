import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiTemplatesService } from './ai-templates.service';
import { AiTemplatesController } from './ai-templates.controller';
import { AiTemplate } from '../entities/ai-template.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AiTemplate])],
  controllers: [AiTemplatesController],
  providers: [AiTemplatesService],
  exports: [AiTemplatesService],
})
export class AiTemplatesModule {}

