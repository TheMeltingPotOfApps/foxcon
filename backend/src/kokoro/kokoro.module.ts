import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KokoroService } from './kokoro.service';
import { KokoroController } from './kokoro.controller';
import { SystemConfig } from '../entities/system-config.entity';
import { ConfigService } from '../config/config.service';
import { AudioProcessingModule } from '../audio-processing/audio-processing.module';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([SystemConfig]), AudioProcessingModule],
  controllers: [KokoroController],
  providers: [KokoroService],
  exports: [KokoroService],
})
export class KokoroModule {}
