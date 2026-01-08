import { Module, Global, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from './config.service';
import { ConfigController } from './config.controller';
import { SystemConfig } from '../entities/system-config.entity';
import { ElevenLabsModule } from '../elevenlabs/elevenlabs.module';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([SystemConfig]),
    forwardRef(() => ElevenLabsModule), // Import to allow refreshing ElevenLabs service
  ],
  controllers: [ConfigController],
  providers: [ConfigService],
  exports: [ConfigService],
})
export class ConfigModule {}

