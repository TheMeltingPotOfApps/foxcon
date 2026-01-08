import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventTypesService } from './event-types.service';
import { EventTypesController } from './event-types.controller';
import { EventType } from '../entities/event-type.entity';

@Module({
  imports: [TypeOrmModule.forFeature([EventType])],
  providers: [EventTypesService],
  controllers: [EventTypesController],
  exports: [EventTypesService],
})
export class EventTypesModule {}

