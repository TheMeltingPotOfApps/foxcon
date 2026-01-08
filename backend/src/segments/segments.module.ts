import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { SegmentsService } from './segments.service';
import { SegmentsController } from './segments.controller';
import { SegmentSchedulerService } from './segment-scheduler.service';
import { Segment } from '../entities/segment.entity';
import { Contact } from '../entities/contact.entity';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([Segment, Contact]),
  ],
  controllers: [SegmentsController],
  providers: [SegmentsService, SegmentSchedulerService],
  exports: [SegmentsService],
})
export class SegmentsModule {}

