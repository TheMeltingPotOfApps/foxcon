import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { CalendarEvent, CalendarEventStatus } from '../entities/calendar-event.entity';
import { EventType } from '../entities/event-type.entity';
import { JourneysService } from '../journeys/journeys.service';
import { TwilioService } from '../twilio/twilio.service';
import { TenantLimitsService } from '../tenant-limits/tenant-limits.service';

@Injectable()
export class EventReminderSchedulerService {
  private readonly logger = new Logger(EventReminderSchedulerService.name);

  constructor(
    @InjectRepository(CalendarEvent)
    private calendarEventRepository: Repository<CalendarEvent>,
    @InjectRepository(EventType)
    private eventTypeRepository: Repository<EventType>,
    private journeysService: JourneysService,
    private twilioService: TwilioService,
    private tenantLimitsService: TenantLimitsService,
  ) {}

  /**
   * Check for events that need reminders
   * Runs every minute
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async processReminders() {
    try {
      const now = new Date();

      // Find all scheduled events in the next 7 days
      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const upcomingEvents = await this.calendarEventRepository
        .createQueryBuilder('event')
        .where('event.status = :status', { status: CalendarEventStatus.SCHEDULED })
        .andWhere('event.startTime >= :now', { now })
        .andWhere('event.startTime <= :sevenDaysFromNow', { sevenDaysFromNow })
        .leftJoinAndSelect('event.eventType', 'eventType')
        .getMany();

      if (upcomingEvents.length === 0) {
        return;
      }

      this.logger.log(`Processing reminders for ${upcomingEvents.length} upcoming events`);

      for (const event of upcomingEvents) {
        if (!event.eventTypeId || !event.contactId) {
          continue;
        }

        try {
          const eventType = await this.eventTypeRepository.findOne({
            where: { id: event.eventTypeId },
          });

          if (!eventType || !eventType.reminderSettings?.enabled) {
            continue;
          }

          const reminders = eventType.reminderSettings.reminders || [];
          const timeUntilEvent = event.startTime.getTime() - now.getTime();

          for (const reminder of reminders) {
            const reminderTime = reminder.minutesBefore * 60 * 1000; // Convert to milliseconds
            const reminderKey = `${reminder.minutesBefore}`;

            // Check if reminder should be sent now
            if (
              timeUntilEvent <= reminderTime &&
              timeUntilEvent > reminderTime - 60000 && // Within 1 minute window
              !event.reminderSent?.[reminderKey]
            ) {
              await this.sendReminder(event, reminder, eventType);
              
              // Mark reminder as sent
              if (!event.reminderSent) {
                event.reminderSent = {};
              }
              event.reminderSent[reminderKey] = true;
              await this.calendarEventRepository.save(event);

              this.logger.log(
                `Sent reminder for event ${event.id} (${reminder.minutesBefore} minutes before)`,
              );
            }
          }
        } catch (error) {
          this.logger.error(
            `Failed to process reminders for event ${event.id}: ${error.message}`,
            error.stack,
          );
        }
      }
    } catch (error) {
      this.logger.error(`Error processing event reminders: ${error.message}`, error.stack);
    }
  }

  private async sendReminder(
    event: CalendarEvent,
    reminder: { minutesBefore: number; message?: string; journeyId?: string },
    eventType: EventType,
  ): Promise<void> {
    try {
      // If journeyId is specified, add contact to journey
      if (reminder.journeyId && event.contactId) {
        await this.journeysService.enrollContact(event.tenantId, reminder.journeyId, {
          contactId: event.contactId,
          enrollmentSource: 'event_reminder',
        });
        this.logger.log(`Added contact ${event.contactId} to journey ${reminder.journeyId} for reminder`);
      }

      // Send SMS reminder if phone number is available
      if (event.attendeePhone && reminder.message) {
        const message = reminder.message
          .replace('{eventTitle}', event.title)
          .replace('{eventTime}', event.startTime.toLocaleString())
          .replace('{attendeeName}', event.attendeeName || 'there');

        const result = await this.twilioService.sendSMS(event.tenantId, event.attendeePhone, message);
        
        // Increment SMS usage count if message was sent successfully
        if (result?.sid) {
          try {
            await this.tenantLimitsService.incrementSMSUsage(event.tenantId, 1);
          } catch (error) {
            this.logger.error(`Failed to increment SMS usage for reminder:`, error);
          }
        }
        
        this.logger.log(`Sent SMS reminder to ${event.attendeePhone}`);
      }
    } catch (error) {
      this.logger.error(`Failed to send reminder: ${error.message}`, error.stack);
    }
  }
}

