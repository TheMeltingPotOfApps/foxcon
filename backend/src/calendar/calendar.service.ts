import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { CalendarEvent, CalendarEventStatus, CalendarEventType } from '../entities/calendar-event.entity';
import { EventTypesService } from '../event-types/event-types.service';
import { JourneysService } from '../journeys/journeys.service';
import { TimezoneService } from '../common/timezone.service';
import { User } from '../entities/user.entity';
import { Contact } from '../entities/contact.entity';
import { Tenant } from '../entities/tenant.entity';

@Injectable()
export class CalendarService {
  constructor(
    @InjectRepository(CalendarEvent)
    private calendarEventRepository: Repository<CalendarEvent>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Contact)
    private contactRepository: Repository<Contact>,
    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,
    private eventTypesService: EventTypesService,
    private journeysService: JourneysService,
    private timezoneService: TimezoneService,
  ) {}

  async createEvent(data: {
    title: string;
    description?: string;
    type: CalendarEventType;
    startTime: Date | string;
    endTime: Date | string;
    attendeeName: string;
    attendeeEmail: string;
    attendeePhone?: string;
    attendeeCompany?: string;
    meetingLink?: string;
    timezone?: string; // Timezone of the provided startTime/endTime
    assignedToUserId?: string;
    metadata?: Record<string, any>;
    tenantId: string;
    eventTypeId?: string;
    contactId?: string;
    journeyId?: string;
  }): Promise<CalendarEvent> {
    // Determine the source timezone for the provided times
    // Priority: 1) provided timezone, 2) contact timezone, 3) user timezone, 4) tenant timezone, 5) UTC
    let sourceTimezone: string | undefined = data.timezone;
    
    if (!sourceTimezone && data.contactId) {
      try {
        const contact = await this.contactRepository.findOne({
          where: { id: data.contactId, tenantId: data.tenantId },
        });
        sourceTimezone = contact?.timezone;
      } catch (error) {
        // Ignore errors, continue with other timezone sources
      }
    }
    
    if (!sourceTimezone && data.assignedToUserId) {
      try {
        const user = await this.userRepository.findOne({
          where: { id: data.assignedToUserId },
        });
        sourceTimezone = user?.timezone;
      } catch (error) {
        // Ignore errors, continue with tenant timezone
      }
    }
    
    if (!sourceTimezone) {
      try {
        const tenant = await this.tenantRepository.findOne({
          where: { id: data.tenantId },
        });
        sourceTimezone = tenant?.timezone;
      } catch (error) {
        // Fall back to UTC
      }
    }
    
    // Convert startTime and endTime to UTC for storage
    // If startTime/endTime are Date objects, they're already in UTC or local time
    // If they're strings, parse them in the source timezone
    let startTimeUTC: Date;
    let endTimeUTC: Date;
    
    if (typeof data.startTime === 'string') {
      // Parse string in the source timezone
      startTimeUTC = sourceTimezone
        ? this.timezoneService.parseInTimezone(data.startTime, sourceTimezone)
        : new Date(data.startTime);
    } else {
      // If it's a Date object, assume it's already in UTC or convert from source timezone
      startTimeUTC = sourceTimezone
        ? this.timezoneService.convertToUTC(data.startTime, sourceTimezone)
        : data.startTime;
    }
    
    if (typeof data.endTime === 'string') {
      endTimeUTC = sourceTimezone
        ? this.timezoneService.parseInTimezone(data.endTime, sourceTimezone)
        : new Date(data.endTime);
    } else {
      endTimeUTC = sourceTimezone
        ? this.timezoneService.convertToUTC(data.endTime, sourceTimezone)
        : data.endTime;
    }
    
    // Determine the event timezone to store (for display purposes)
    // Use contact timezone if available, otherwise user timezone, otherwise tenant timezone
    let eventTimezone: string | undefined = sourceTimezone;
    
    // Check for conflicts using UTC times
    const conflicts = await this.calendarEventRepository.find({
      where: {
        tenantId: data.tenantId,
        assignedToUserId: data.assignedToUserId,
        status: CalendarEventStatus.SCHEDULED,
        startTime: Between(startTimeUTC, endTimeUTC),
      },
    });

    if (conflicts.length > 0) {
      throw new BadRequestException('Time slot is already booked');
    }

    const event = this.calendarEventRepository.create({
      ...data,
      startTime: startTimeUTC,
      endTime: endTimeUTC,
      timezone: eventTimezone, // Store the timezone for display purposes
      status: CalendarEventStatus.SCHEDULED,
    });

    const savedEvent = await this.calendarEventRepository.save(event);

    // Execute actions if eventTypeId is provided
    if (data.eventTypeId && data.contactId) {
      try {
        const eventType = await this.eventTypesService.findOne(data.tenantId, data.eventTypeId);
        if (eventType.actions && eventType.actions.length > 0) {
          await this.executeEventActions(data.tenantId, eventType.actions, data.contactId, savedEvent.id);
        }
      } catch (error) {
        // Log but don't fail event creation
        console.error('Failed to execute event actions:', error);
      }
    }

    return savedEvent;
  }

  private async executeEventActions(
    tenantId: string,
    actions: any[],
    contactId: string,
    eventId: string,
  ): Promise<void> {
    for (const action of actions) {
      try {
        switch (action.type) {
          case 'ADD_TO_JOURNEY':
            if (action.config.journeyId) {
              await this.journeysService.enrollContact(tenantId, action.config.journeyId, {
                contactId,
                enrollmentSource: 'event_scheduled',
              });
            }
            break;
          case 'UPDATE_CONTACT_STATUS':
            // Will be implemented when contact service is available
            break;
          case 'SEND_SMS':
            // Will be implemented when SMS service is available
            break;
          case 'CREATE_TASK':
            // Will be implemented when task service is available
            break;
        }
      } catch (error) {
        console.error(`Failed to execute action ${action.type}:`, error);
      }
    }
  }

  async getEvents(filters: {
    tenantId?: string;
    assignedToUserId?: string;
    startDate?: Date;
    endDate?: Date;
    status?: CalendarEventStatus;
    type?: CalendarEventType;
    contactId?: string;
  }): Promise<CalendarEvent[]> {
    try {
      // If no tenantId provided, return empty array to prevent unauthorized access
      if (!filters.tenantId) {
        return [];
      }

      const query = this.calendarEventRepository.createQueryBuilder('event');

      query.andWhere('event.tenantId = :tenantId', { tenantId: filters.tenantId });

      if (filters.assignedToUserId) {
        query.andWhere('event.assignedToUserId = :assignedToUserId', {
          assignedToUserId: filters.assignedToUserId,
        });
      }

      if (filters.startDate) {
        query.andWhere('event.startTime >= :startDate', { startDate: filters.startDate });
      }

      if (filters.endDate) {
        query.andWhere('event.endTime <= :endDate', { endDate: filters.endDate });
      }

      if (filters.status) {
        query.andWhere('event.status = :status', { status: filters.status });
      }

      if (filters.type) {
        query.andWhere('event.type = :type', { type: filters.type });
      }

      if (filters.contactId) {
        query.andWhere('event.contactId = :contactId', { contactId: filters.contactId });
      }

      query.orderBy('event.startTime', 'ASC');

      return await query.getMany();
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      // Return empty array instead of throwing to prevent 500 errors
      return [];
    }
  }

  async getEventById(id: string, tenantId?: string): Promise<CalendarEvent> {
    const where: any = { id };
    if (tenantId) {
      where.tenantId = tenantId;
    }

    const event = await this.calendarEventRepository.findOne({ where });

    if (!event) {
      throw new NotFoundException('Calendar event not found');
    }

    return event;
  }

  async updateEvent(
    id: string,
    updates: Partial<CalendarEvent>,
    tenantId?: string,
  ): Promise<CalendarEvent> {
    const event = await this.getEventById(id, tenantId);

    Object.assign(event, updates);
    return this.calendarEventRepository.save(event);
  }

  async cancelEvent(
    id: string,
    reason?: string,
    tenantId?: string,
  ): Promise<CalendarEvent> {
    const event = await this.getEventById(id, tenantId);

    event.status = CalendarEventStatus.CANCELLED;
    event.cancelledAt = new Date();
    event.cancellationReason = reason;

    return this.calendarEventRepository.save(event);
  }

  async getAvailableTimeSlots(
    assignedToUserId: string,
    startDate: Date,
    endDate: Date,
    durationMinutes: number = 30,
  ): Promise<Date[]> {
    const events = await this.getEvents({
      assignedToUserId,
      startDate,
      endDate,
      status: CalendarEventStatus.SCHEDULED,
    });

    const slots: Date[] = [];
    const current = new Date(startDate);

    while (current < endDate) {
      const slotEnd = new Date(current.getTime() + durationMinutes * 60000);
      const hasConflict = events.some(
        (event) =>
          (event.startTime <= current && event.endTime > current) ||
          (event.startTime < slotEnd && event.endTime >= slotEnd) ||
          (event.startTime >= current && event.endTime <= slotEnd),
      );

      if (!hasConflict) {
        slots.push(new Date(current));
      }

      current.setMinutes(current.getMinutes() + durationMinutes);
    }

    return slots;
  }
}

