import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ElevenLabsService } from './elevenlabs.service';
import { ElevenLabsController } from './elevenlabs.controller';
import { SystemConfig } from '../entities/system-config.entity';
import { ConfigService } from '../config/config.service';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([SystemConfig])],
  controllers: [ElevenLabsController],
  providers: [ElevenLabsService],
  exports: [ElevenLabsService],
})
export class ElevenLabsModule {}

