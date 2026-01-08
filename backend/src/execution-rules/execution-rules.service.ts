import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExecutionRules, AfterHoursAction, TcpaviolationAction, ResubmissionAction } from '../entities/execution-rules.entity';
import { Tenant } from '../entities/tenant.entity';

@Injectable()
export class ExecutionRulesService {
  private readonly logger = new Logger(ExecutionRulesService.name);
  // Cache for execution rules to reduce database queries
  private rulesCache = new Map<string, { rules: ExecutionRules; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(
    @InjectRepository(ExecutionRules)
    private executionRulesRepository: Repository<ExecutionRules>,
    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,
  ) {}

  async getExecutionRules(tenantId: string): Promise<ExecutionRules> {
    // Check cache first
    const cached = this.rulesCache.get(tenantId);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.rules;
    }
    try {
      let rules = await this.executionRulesRepository.findOne({
        where: { tenantId },
      });

      if (!rules) {
        // Create default rules
        rules = this.executionRulesRepository.create({
          tenantId,
          afterHoursAction: AfterHoursAction.RESCHEDULE_NEXT_BUSINESS_DAY,
          tcpaViolationAction: TcpaviolationAction.BLOCK,
          resubmissionAction: ResubmissionAction.SKIP_DUPLICATE,
          afterHoursBusinessHours: {
            startHour: 8,
            endHour: 21,
            daysOfWeek: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
          },
          resubmissionDetectionWindowHours: 24,
          enableAfterHoursHandling: true,
          enableTcpaviolationHandling: true,
          enableResubmissionHandling: true,
        });
        rules = await this.executionRulesRepository.save(rules);
      }

      // Update cache
      this.rulesCache.set(tenantId, { rules, timestamp: Date.now() });
      return rules;
    } catch (error) {
      this.logger.error(`Error getting execution rules: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Clear cache for a specific tenant (call this when rules are updated)
   */
  clearCache(tenantId?: string): void {
    if (tenantId) {
      this.rulesCache.delete(tenantId);
    } else {
      this.rulesCache.clear();
    }
  }

  async updateExecutionRules(tenantId: string, updates: Partial<ExecutionRules>): Promise<ExecutionRules> {
    let rules = await this.executionRulesRepository.findOne({
      where: { tenantId },
    });

    if (!rules) {
      rules = this.executionRulesRepository.create({
        tenantId,
        ...updates,
      });
    } else {
      Object.assign(rules, updates);
    }

    const updatedRules = await this.executionRulesRepository.save(rules);
    
    // Clear cache for this tenant
    this.clearCache(tenantId);
    
    return updatedRules;
  }

  /**
   * Check if a scheduled time is outside business hours
   * Uses tenant timezone for accurate time checking
   */
  isAfterHours(scheduledTime: Date, rules: ExecutionRules, tenantTimezone?: string): boolean {
    if (!rules.enableAfterHoursHandling || !rules.afterHoursBusinessHours) {
      return false;
    }

    const businessHours = rules.afterHoursBusinessHours;
    const timezone = tenantTimezone || businessHours.timezone || 'America/New_York';
    
    // Get time components in tenant timezone
    const { hour, dayOfWeek } = this.getTimeInTimezone(scheduledTime, timezone);

    // Check if outside business hours
    if (hour < businessHours.startHour || hour >= businessHours.endHour) {
      return true;
    }

    // Check if on restricted day
    if (businessHours.daysOfWeek && businessHours.daysOfWeek.length > 0) {
      if (!businessHours.daysOfWeek.includes(dayOfWeek)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get the current hour, minute, and day of week in a specific timezone
   */
  getTimeInTimezone(date: Date, timezone: string): { hour: number; minute: number; dayOfWeek: string } {
    // Validate date
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      this.logger.warn(`Invalid date provided to getTimeInTimezone: ${date}`);
      // Return current time as fallback
      date = new Date();
    }

    try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      weekday: 'long',
      hour12: false,
    });
    
    const parts = formatter.formatToParts(date);
      const hourPart = parts.find(p => p.type === 'hour');
      const minutePart = parts.find(p => p.type === 'minute');
      const weekdayPart = parts.find(p => p.type === 'weekday');
      
      if (!hourPart || !minutePart || !weekdayPart) {
        throw new Error('Failed to parse date parts');
      }
      
      const hour = parseInt(hourPart.value);
      const minute = parseInt(minutePart.value);
      const dayOfWeek = weekdayPart.value.toUpperCase();
    
    return { hour, minute, dayOfWeek };
    } catch (error) {
      this.logger.error(`Error getting time in timezone ${timezone}: ${error.message}`, error.stack);
      // Return current time in UTC as fallback
      const now = new Date();
      return {
        hour: now.getUTCHours(),
        minute: now.getUTCMinutes(),
        dayOfWeek: ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'][now.getUTCDay()],
      };
    }
  }

  /**
   * Get date components (year, month, day) in a specific timezone
   */
  private getDateComponentsInTimezone(date: Date, timezone: string): { year: number; month: number; day: number } {
    // Validate date
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      this.logger.warn(`Invalid date provided to getDateComponentsInTimezone: ${date}`);
      // Return current date as fallback
      date = new Date();
    }

    try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    
    const parts = formatter.formatToParts(date);
      const yearPart = parts.find(p => p.type === 'year');
      const monthPart = parts.find(p => p.type === 'month');
      const dayPart = parts.find(p => p.type === 'day');
      
      if (!yearPart || !monthPart || !dayPart) {
        throw new Error('Failed to parse date components');
      }
      
      const year = parseInt(yearPart.value);
      const month = parseInt(monthPart.value) - 1; // 0-indexed
      const day = parseInt(dayPart.value);
    
    return { year, month, day };
    } catch (error) {
      this.logger.error(`Error getting date components in timezone ${timezone}: ${error.message}`, error.stack);
      // Return current UTC date as fallback
      const now = new Date();
      return {
        year: now.getUTCFullYear(),
        month: now.getUTCMonth(),
        day: now.getUTCDate(),
      };
    }
  }

  /**
   * Get the current time in a specific timezone (for logging)
   */
  getCurrentTimeInTimezone(timezone: string): Date {
    const now = new Date();
    const { hour, dayOfWeek } = this.getTimeInTimezone(now, timezone);
    // Return a date string representation for logging
    return new Date(now.toLocaleString('en-US', { timeZone: timezone }));
  }

  /**
   * Calculate next available time based on after hours action
   * Uses tenant timezone for accurate time calculation
   */
  calculateNextAvailableTime(scheduledTime: Date, rules: ExecutionRules, tenantTimezone?: string): Date {
    const businessHours = rules.afterHoursBusinessHours || {
      startHour: 8,
      endHour: 21,
      daysOfWeek: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
    };
    const timezone = tenantTimezone || businessHours.timezone || 'America/New_York';
    
    // Use current time as reference (we want next available time from now)
    const now = new Date();
    const { hour: currentHour, dayOfWeek: currentDay } = this.getTimeInTimezone(now, timezone);
    
    // Get the date components in the tenant timezone
    const todayComponents = this.getDateComponentsInTimezone(now, timezone);
    
    // Start with tomorrow at business start hour (in tenant timezone)
    let tomorrowComponents = { ...todayComponents };
    tomorrowComponents.day++;
    // Handle month/year rollover
    if (tomorrowComponents.day > 31) {
      tomorrowComponents.day = 1;
      tomorrowComponents.month++;
      if (tomorrowComponents.month > 11) {
        tomorrowComponents.month = 0;
        tomorrowComponents.year++;
      }
    }

    switch (rules.afterHoursAction) {
      case AfterHoursAction.RESCHEDULE_NEXT_AVAILABLE:
        // Check if we can schedule today (if still within business hours)
        if (currentHour < businessHours.endHour) {
          // Check if today is a business day
          if (!businessHours.daysOfWeek || businessHours.daysOfWeek.length === 0 || businessHours.daysOfWeek.includes(currentDay)) {
            // Can schedule today at start hour if it hasn't passed, otherwise tomorrow
            if (currentHour < businessHours.startHour) {
              // Use today's date in tenant timezone
              const todayInTimezone = this.getDateComponentsInTimezone(now, timezone);
              return this.createUTCDateForTimezone(
                new Date(todayInTimezone.year, todayInTimezone.month, todayInTimezone.day),
                businessHours.startHour,
                0,
                timezone
              );
            }
          }
        }
        
        // Skip to next business day if needed
        let nextBusinessDay = { ...tomorrowComponents };
        while (businessHours.daysOfWeek && businessHours.daysOfWeek.length > 0) {
          const testDate = new Date(nextBusinessDay.year, nextBusinessDay.month, nextBusinessDay.day);
          const { dayOfWeek } = this.getTimeInTimezone(testDate, timezone);
          if (!businessHours.daysOfWeek.includes(dayOfWeek)) {
            nextBusinessDay.day++;
            if (nextBusinessDay.day > 31) {
              nextBusinessDay.day = 1;
              nextBusinessDay.month++;
              if (nextBusinessDay.month > 11) {
                nextBusinessDay.month = 0;
                nextBusinessDay.year++;
              }
            }
          } else {
            break;
          }
        }
        
        // Convert to UTC by creating date in timezone and converting
        return this.createUTCDateForTimezone(
          new Date(nextBusinessDay.year, nextBusinessDay.month, nextBusinessDay.day),
          businessHours.startHour,
          0,
          timezone
        );

      case AfterHoursAction.RESCHEDULE_NEXT_BUSINESS_DAY:
        // Skip to next business day
        let nextDay = { ...tomorrowComponents };
        while (businessHours.daysOfWeek && businessHours.daysOfWeek.length > 0) {
          const testDate = new Date(nextDay.year, nextDay.month, nextDay.day);
          const { dayOfWeek } = this.getTimeInTimezone(testDate, timezone);
          if (!businessHours.daysOfWeek.includes(dayOfWeek)) {
            nextDay.day++;
            if (nextDay.day > 31) {
              nextDay.day = 1;
              nextDay.month++;
              if (nextDay.month > 11) {
                nextDay.month = 0;
                nextDay.year++;
              }
            }
          } else {
            break;
          }
        }
        return this.createUTCDateForTimezone(
          new Date(nextDay.year, nextDay.month, nextDay.day),
          businessHours.startHour,
          0,
          timezone
        );

      case AfterHoursAction.RESCHEDULE_SPECIFIC_TIME:
        // Use configured reschedule time
        if (rules.afterHoursRescheduleTime) {
          const [hours, minutes] = rules.afterHoursRescheduleTime.split(':').map(Number);
          
          // If time has passed today, move to tomorrow
          const { hour } = this.getTimeInTimezone(now, timezone);
          let rescheduleDate = this.getDateComponentsInTimezone(now, timezone);
          if (hour >= hours) {
            rescheduleDate.day++;
            if (rescheduleDate.day > 31) {
              rescheduleDate.day = 1;
              rescheduleDate.month++;
              if (rescheduleDate.month > 11) {
                rescheduleDate.month = 0;
                rescheduleDate.year++;
              }
            }
          }
          
          // Skip weekends if needed
          while (businessHours.daysOfWeek && businessHours.daysOfWeek.length > 0) {
            const testDate = new Date(rescheduleDate.year, rescheduleDate.month, rescheduleDate.day);
            const { dayOfWeek } = this.getTimeInTimezone(testDate, timezone);
            if (!businessHours.daysOfWeek.includes(dayOfWeek)) {
              rescheduleDate.day++;
              if (rescheduleDate.day > 31) {
                rescheduleDate.day = 1;
                rescheduleDate.month++;
                if (rescheduleDate.month > 11) {
                  rescheduleDate.month = 0;
                  rescheduleDate.year++;
                }
              }
            } else {
              break;
            }
          }
          return this.createUTCDateForTimezone(
            new Date(rescheduleDate.year, rescheduleDate.month, rescheduleDate.day),
            hours,
            minutes,
            timezone
          );
        }
        return scheduledTime;

      default:
        return scheduledTime;
    }
  }

  /**
   * Create a UTC Date object that represents a specific local time in a timezone
   * Properly converts from timezone-local time to UTC using iterative adjustment
   */
  private createUTCDateForTimezone(date: Date, hour: number, minute: number, timezone: string): Date {
    // Get the date components in the timezone from the provided date
    const dateComponents = this.getDateComponentsInTimezone(date, timezone);
    
    // Start with a UTC date estimate
    // Create UTC date for the target date/time (this is an estimate)
    let testDate = new Date(Date.UTC(dateComponents.year, dateComponents.month, dateComponents.day, hour, minute, 0));
    
    // Now iteratively adjust until the timezone representation matches our target
    let attempts = 0;
    const maxAttempts = 50;
    
    while (attempts < maxAttempts) {
      const testComponents = this.getDateComponentsInTimezone(testDate, timezone);
      const { hour: testHour } = this.getTimeInTimezone(testDate, timezone);
      
      // Check if we match exactly
      const { minute: testMinute } = this.getTimeInTimezone(testDate, timezone);
      if (testHour === hour && 
          (testMinute === minute || minute === 0) &&
          testComponents.day === dateComponents.day && 
          testComponents.month === dateComponents.month && 
          testComponents.year === dateComponents.year) {
        this.logger.debug(`Found UTC time for ${dateComponents.year}-${dateComponents.month + 1}-${dateComponents.day} ${hour}:${minute} in ${timezone}: ${testDate.toISOString()}`);
        return testDate;
      }
      
      // Calculate adjustment needed
      const hourDiff = hour - testHour;
      const dayDiff = dateComponents.day - testComponents.day;
      const monthDiff = dateComponents.month - testComponents.month;
      const yearDiff = dateComponents.year - testComponents.year;
      
      // Adjust the UTC date
      if (yearDiff !== 0 || monthDiff !== 0 || dayDiff !== 0) {
        // Date mismatch - adjust by days (more precise calculation)
        let daysToAdd = dayDiff;
        if (monthDiff !== 0) {
          // Approximate: add days for month difference
          daysToAdd += monthDiff * 30;
        }
        if (yearDiff !== 0) {
          daysToAdd += yearDiff * 365;
        }
        testDate = new Date(testDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
      } else if (hourDiff !== 0) {
        // Hour mismatch - adjust by hours
        testDate = new Date(testDate.getTime() + hourDiff * 60 * 60 * 1000);
      } else {
        // Shouldn't happen, but break if no difference
        break;
      }
      
      attempts++;
    }
    
    // If we couldn't find exact match, log warning and return best estimate
    const dateStr = `${dateComponents.year}-${dateComponents.month + 1}-${dateComponents.day} ${hour}:${minute}`;
    this.logger.warn(`Could not find exact UTC time for ${dateStr} in ${timezone} after ${attempts} attempts. Using approximation: ${testDate.toISOString()}`);
    return testDate;
  }
}


