import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CalendarService } from './calendar.service';
import { CalendarController } from './calendar.controller';
import { CalendarBookingController } from './calendar-booking.controller';
import { EventReminderSchedulerService } from './event-reminder-scheduler.service';
import { CalendarEvent } from '../entities/calendar-event.entity';
import { EventType } from '../entities/event-type.entity';
import { User } from '../entities/user.entity';
import { Contact } from '../entities/contact.entity';
import { Tenant } from '../entities/tenant.entity';
import { EventTypesModule } from '../event-types/event-types.module';
import { AvailabilityModule } from '../availability/availability.module';
import { ContactsModule } from '../contacts/contacts.module';
import { JourneysModule } from '../journeys/journeys.module';
import { TwilioModule } from '../twilio/twilio.module';
import { TenantLimitsModule } from '../tenant-limits/tenant-limits.module';
import { TimezoneService } from '../common/timezone.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([CalendarEvent, EventType, User, Contact, Tenant]),
    EventTypesModule,
    AvailabilityModule,
    ContactsModule,
    forwardRef(() => JourneysModule),
    TwilioModule,
    TenantLimitsModule,
  ],
  providers: [CalendarService, EventReminderSchedulerService, TimezoneService],
  controllers: [CalendarController, CalendarBookingController],
  exports: [CalendarService, TimezoneService],
})
export class CalendarModule {}

