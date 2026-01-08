import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Availability, DayOfWeek } from '../entities/availability.entity';
import { CalendarEvent, CalendarEventStatus } from '../entities/calendar-event.entity';
import { TimezoneService } from '../common/timezone.service';
import { User } from '../entities/user.entity';
import { Tenant } from '../entities/tenant.entity';

@Injectable()
export class AvailabilityService {
  constructor(
    @InjectRepository(Availability)
    private availabilityRepository: Repository<Availability>,
    @InjectRepository(CalendarEvent)
    private calendarEventRepository: Repository<CalendarEvent>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,
    private timezoneService: TimezoneService,
  ) {}

  async create(tenantId: string, data: Partial<Availability>): Promise<Availability> {
    const availability = this.availabilityRepository.create({
      ...data,
      tenantId,
    });
    return this.availabilityRepository.save(availability);
  }

  async findAll(tenantId: string, eventTypeId?: string): Promise<Availability[]> {
    const where: any = { tenantId };
    if (eventTypeId) {
      where.eventTypeId = eventTypeId;
    }
    return this.availabilityRepository.find({
      where,
      relations: ['eventType'],
      order: { createdAt: 'DESC' },
    });
  }

  async findAllForEventType(eventTypeId: string, tenantId?: string): Promise<Availability[]> {
    const where: any = { eventTypeId, isActive: true };
    if (tenantId) {
      where.tenantId = tenantId;
    }
    return this.availabilityRepository.find({
      where,
      relations: ['eventType'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(tenantId: string, id: string): Promise<Availability> {
    const availability = await this.availabilityRepository.findOne({
      where: { id, tenantId },
      relations: ['eventType'],
    });

    if (!availability) {
      throw new NotFoundException('Availability not found');
    }

    return availability;
  }

  async update(tenantId: string, id: string, data: Partial<Availability>): Promise<Availability> {
    const availability = await this.findOne(tenantId, id);
    Object.assign(availability, data);
    return this.availabilityRepository.save(availability);
  }

  async delete(tenantId: string, id: string): Promise<void> {
    const availability = await this.findOne(tenantId, id);
    await this.availabilityRepository.remove(availability);
  }

  async getAvailableSlots(
    tenantId: string,
    eventTypeId: string,
    startDate: Date,
    endDate: Date,
    assignedToUserId?: string,
    requestTimezone?: string, // Timezone of the requesting user/contact
  ): Promise<Date[]> {
    // Get availability for this event type
    // If assignedToUserId is provided, include:
    //   - Availabilities assigned to that specific user
    //   - Availabilities with assignedToUserId = null (available to all users)
    // Otherwise, include all availabilities
    const where: any = {
        tenantId,
        eventTypeId,
        isActive: true,
    };
    
    let availabilities;
    // Handle assignedToUserId: if provided (not undefined/null), include both user-specific and "all users" availabilities
    // If not provided (undefined), include all availabilities
    if (assignedToUserId !== undefined && assignedToUserId !== null && assignedToUserId !== '') {
      // Include both user-specific and "all users" (null) availabilities
      availabilities = await this.availabilityRepository
        .createQueryBuilder('availability')
        .where('availability.tenantId = :tenantId', { tenantId })
        .andWhere('availability.eventTypeId = :eventTypeId', { eventTypeId })
        .andWhere('availability.isActive = :isActive', { isActive: true })
        .andWhere('(availability.assignedToUserId = :assignedToUserId OR availability.assignedToUserId IS NULL)', { assignedToUserId })
        .leftJoinAndSelect('availability.eventType', 'eventType')
        .getMany();
    } else {
      // Include all availabilities (when assignedToUserId is undefined, null, or empty string)
      availabilities = await this.availabilityRepository.find({
        where,
        relations: ['eventType'],
      });
    }

    if (availabilities.length === 0) {
      return [];
    }

    // Determine the timezone to use for availability schedule
    // Priority: 1) availability schedule timezone, 2) user timezone, 3) tenant timezone, 4) request timezone, 5) UTC
    let scheduleTimezone: string | undefined;
    
    if (assignedToUserId) {
      try {
        const user = await this.userRepository.findOne({
          where: { id: assignedToUserId },
        });
        scheduleTimezone = user?.timezone;
      } catch (error) {
        // Continue with other sources
      }
    }
    
    if (!scheduleTimezone) {
      try {
        const tenant = await this.tenantRepository.findOne({
          where: { id: tenantId },
        });
        scheduleTimezone = tenant?.timezone;
      } catch (error) {
        // Continue with request timezone
      }
    }
    
    if (!scheduleTimezone) {
      scheduleTimezone = requestTimezone;
    }
    
    // Convert startDate and endDate to UTC if they're in a specific timezone
    // For now, assume startDate/endDate are already in UTC or the schedule timezone
    // We'll work in UTC internally for consistency
    
    // Get existing events for conflict checking (filter by eventTypeId)
    const existingEvents = await this.calendarEventRepository.find({
      where: {
        tenantId,
        eventTypeId,
        assignedToUserId: assignedToUserId || undefined,
        status: CalendarEventStatus.SCHEDULED,
        startTime: Between(startDate, endDate),
      },
    });

    const availableSlots: Date[] = [];
    
    // Helper function to get date string in a specific timezone
    const getDateStringInTimezone = (date: Date, timezone: string): string => {
      if (!timezone || timezone === 'UTC') {
        return date.toISOString().split('T')[0];
      }
      
      // Use Intl.DateTimeFormat to format the date in the target timezone
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      
      return formatter.format(date);
    };
    
    // Helper function to get day of week in a specific timezone
    const getDayOfWeekInTimezone = (date: Date, timezone: string): DayOfWeek => {
      if (!timezone || timezone === 'UTC') {
        return this.getDayOfWeek(date);
      }
      
      // Convert UTC date to timezone and get day of week
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        weekday: 'long',
      });
      
      const weekday = formatter.format(date);
      const dayMap: Record<string, DayOfWeek> = {
        'Sunday': DayOfWeek.SUNDAY,
        'Monday': DayOfWeek.MONDAY,
        'Tuesday': DayOfWeek.TUESDAY,
        'Wednesday': DayOfWeek.WEDNESDAY,
        'Thursday': DayOfWeek.THURSDAY,
        'Friday': DayOfWeek.FRIDAY,
        'Saturday': DayOfWeek.SATURDAY,
      };
      
      return dayMap[weekday] || DayOfWeek.SUNDAY;
    };
    
    // Iterate through days, expanding range to account for timezone differences
    // Start one day before and end one day after to ensure we cover all possible days
    const current = new Date(startDate);
    current.setDate(current.getDate() - 1);
    current.setHours(0, 0, 0, 0);
    
    const safeEndDate = new Date(endDate);
    safeEndDate.setDate(safeEndDate.getDate() + 1);
    safeEndDate.setHours(23, 59, 59, 999);

    while (current <= safeEndDate) {
      // Check each availability for this day
      for (const availability of availabilities) {
        // Get the schedule timezone from the availability (use first enabled day's timezone or fallback)
        let scheduleTz = scheduleTimezone || 'UTC';
        for (const dayKey of Object.keys(availability.weeklySchedule) as DayOfWeek[]) {
          const daySchedule = availability.weeklySchedule[dayKey];
          if (daySchedule?.enabled && daySchedule.timezone) {
            scheduleTz = daySchedule.timezone;
            break;
          }
        }
        
        // Get the date string and day of week in the schedule timezone
        const dateStr = getDateStringInTimezone(current, scheduleTz);
        const dayOfWeek = getDayOfWeekInTimezone(current, scheduleTz);
        
        // Check if date is blocked
        const isBlocked = availability.blockedDates?.includes(dateStr);
        
        if (!isBlocked) {
          const daySchedule = availability.weeklySchedule[dayOfWeek];
          if (daySchedule?.enabled) {
            // Use timezone from this specific day schedule if available
            const dayScheduleTz = daySchedule.timezone || scheduleTz;
            
            const [startHour, startMinute] = daySchedule.startTime.split(':').map(Number);
            const [endHour, endMinute] = daySchedule.endTime.split(':').map(Number);

            // Create date/time strings in the schedule timezone
            // Use the date string from the schedule timezone
            const startTimeStr = `${dateStr}T${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}:00`;
            const endTimeStr = `${dateStr}T${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}:00`;
            
            // Parse and convert to UTC
            const slotTimeUTC = this.timezoneService.parseInTimezone(startTimeStr, dayScheduleTz);
            const endTimeUTC = this.timezoneService.parseInTimezone(endTimeStr, dayScheduleTz);

            // Generate slots within this availability window
            const duration = availability.eventType?.durationMinutes || 30;
            let slot = new Date(slotTimeUTC);

            while (slot < endTimeUTC) {
              const slotEnd = new Date(slot.getTime() + duration * 60000);

              // Check if slot conflicts with existing events (all times in UTC)
              const conflictingEvents = existingEvents.filter(
                (event) =>
                  (event.startTime <= slot && event.endTime > slot) ||
                  (event.startTime < slotEnd && event.endTime >= slotEnd) ||
                  (event.startTime >= slot && event.endTime <= slotEnd),
              );

              // Check max events per slot
              const maxEventsPerSlot = availability.maxEventsPerSlot || 1;
              const hasConflict = conflictingEvents.length >= maxEventsPerSlot;

              // Check if within date range (all times in UTC)
              if (
                slot >= startDate &&
                slot < endDate &&
                (!availability.startDate || slot >= availability.startDate) &&
                (!availability.endDate || slot <= availability.endDate) &&
                !hasConflict
              ) {
                availableSlots.push(new Date(slot)); // Store in UTC
              }

              slot = new Date(slot.getTime() + duration * 60000);
            }
          }
        }
      }

      // Move to next day
      current.setDate(current.getDate() + 1);
      current.setHours(0, 0, 0, 0);
    }

    // Sort and deduplicate
    return Array.from(
      new Set(availableSlots.map((s) => s.getTime())),
    )
      .map((t) => new Date(t))
      .sort((a, b) => a.getTime() - b.getTime());
  }

  private getDayOfWeek(date: Date): DayOfWeek {
    const days = [
      DayOfWeek.SUNDAY,
      DayOfWeek.MONDAY,
      DayOfWeek.TUESDAY,
      DayOfWeek.WEDNESDAY,
      DayOfWeek.THURSDAY,
      DayOfWeek.FRIDAY,
      DayOfWeek.SATURDAY,
    ];
    return days[date.getDay()];
  }
}

