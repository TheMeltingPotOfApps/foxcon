import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VoicePreset } from '../entities/voice-preset.entity';
import { VoicePresetsService } from './voice-presets.service';
import { VoicePresetsController } from './voice-presets.controller';

@Module({
  imports: [TypeOrmModule.forFeature([VoicePreset])],
  controllers: [VoicePresetsController],
  providers: [VoicePresetsService],
  exports: [VoicePresetsService],
})
export class VoicePresetsModule {}
