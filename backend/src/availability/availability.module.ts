import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AvailabilityService } from './availability.service';
import { AvailabilityController } from './availability.controller';
import { Availability } from '../entities/availability.entity';
import { CalendarEvent } from '../entities/calendar-event.entity';
import { User } from '../entities/user.entity';
import { Tenant } from '../entities/tenant.entity';
import { TimezoneService } from '../common/timezone.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Availability, CalendarEvent, User, Tenant]),
  ],
  providers: [AvailabilityService, TimezoneService],
  controllers: [AvailabilityController],
  exports: [AvailabilityService],
})
export class AvailabilityModule {}

