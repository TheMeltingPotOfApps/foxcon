import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { EventTypesService } from '../event-types/event-types.service';
import { CalendarService } from '../calendar/calendar.service';
import { Contact } from '../entities/contact.entity';
import { ANTHROPIC_API_KEY } from '../config/anthropic-api-key.constants';

@Injectable()
export class AiEventCreationService {
  private readonly logger = new Logger(AiEventCreationService.name);
  private claudeClient: Anthropic | null = null;

  constructor(
    private configService: ConfigService,
    private eventTypesService: EventTypesService,
    private calendarService: CalendarService,
  ) {
    this.initializeClient();
  }

  private initializeClient() {
    // Use hard-coded API key - non-configurable for all tenants
    this.claudeClient = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
    this.logger.log('Anthropic Claude client initialized with hard-coded API key');
  }

  /**
   * Parse a time request from a contact message and create an event
   * Examples: "call me in 5 mins", "schedule for tomorrow at 2pm", "book a call next week"
   */
  async parseAndCreateEvent(
    tenantId: string,
    contact: Contact,
    message: string,
    aiTemplateId: string,
  ): Promise<{ success: boolean; eventId?: string; suggestedTime?: Date; error?: string }> {
    try {
      if (!this.claudeClient) {
        this.initializeClient();
      }

      // Get event types assigned to this AI template
      const eventTypes = await this.eventTypesService.findByAiTemplate(tenantId, aiTemplateId);
      if (eventTypes.length === 0) {
        this.logger.warn(`No event types found for AI template ${aiTemplateId}`);
        return { success: false, error: 'No event types configured for this AI messenger' };
      }

      // Build prompt to extract time and event type
      const eventTypeList = eventTypes.map((et) => `- ${et.name} (${et.durationMinutes} mins)`).join('\n');
      
      const systemPrompt = `You are an AI assistant that helps schedule events. Extract scheduling information from user messages.

Available event types:
${eventTypeList}

Extract:
1. The event type name (must match one of the available types)
2. The requested time (e.g., "in 5 minutes", "tomorrow at 2pm", "next Monday at 10am")
3. If no specific time is mentioned, suggest the next available time

Respond with JSON only:
{
  "eventTypeName": "name of event type",
  "requestedTime": "ISO 8601 datetime string or relative time description",
  "suggestedTime": "ISO 8601 datetime string (calculated from current time)",
  "confidence": "high|medium|low"
}`;

      const response = await this.claudeClient.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 500,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: `Current time: ${new Date().toISOString()}\n\nUser message: "${message}"`,
          },
        ],
      });

      let extractedData: any = {};
      if (response.content && Array.isArray(response.content)) {
        for (const contentBlock of response.content) {
          if (contentBlock.type === 'text') {
            try {
              // Extract JSON from response
              const jsonMatch = contentBlock.text.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                extractedData = JSON.parse(jsonMatch[0]);
              }
            } catch (e) {
              this.logger.error(`Failed to parse AI response: ${e.message}`);
            }
          }
        }
      }

      if (!extractedData.eventTypeName || !extractedData.suggestedTime) {
        return { success: false, error: 'Could not extract scheduling information' };
      }

      // Find matching event type
      const eventType = eventTypes.find(
        (et) => et.name.toLowerCase() === extractedData.eventTypeName.toLowerCase(),
      );

      if (!eventType) {
        return { success: false, error: `Event type "${extractedData.eventTypeName}" not found` };
      }

      // Parse suggested time
      let suggestedTime: Date;
      try {
        suggestedTime = new Date(extractedData.suggestedTime);
        if (isNaN(suggestedTime.getTime())) {
          // Try to parse relative time
          suggestedTime = this.parseRelativeTime(extractedData.requestedTime || extractedData.suggestedTime);
        }
      } catch (e) {
        suggestedTime = this.parseRelativeTime(extractedData.requestedTime || 'in 30 minutes');
      }

      // Create the event
      const endTime = new Date(suggestedTime.getTime() + (eventType.durationMinutes || 30) * 60000);
      
      const event = await this.calendarService.createEvent({
        tenantId,
        title: `${eventType.name} with ${contact.firstName || contact.phoneNumber}`,
        description: `Scheduled via AI messenger from message: "${message}"`,
        type: 'SALES_CALL' as any, // Will be updated to use eventTypeId
        startTime: suggestedTime,
        endTime,
        attendeeName: `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || contact.phoneNumber,
        attendeeEmail: contact.email || '',
        attendeePhone: contact.phoneNumber,
        eventTypeId: eventType.id,
        contactId: contact.id,
        metadata: {
          createdByAi: true,
          aiTemplateId,
          originalMessage: message,
        },
      });

      // Execute actions
      if (eventType.actions && eventType.actions.length > 0) {
        await this.executeEventActions(tenantId, eventType.actions, contact.id, event.id);
      }

      this.logger.log(`Created event ${event.id} for contact ${contact.id} at ${suggestedTime.toISOString()}`);

      return {
        success: true,
        eventId: event.id,
        suggestedTime,
      };
    } catch (error: any) {
      this.logger.error(`Failed to create event from AI: ${error.message}`, error.stack);
      return { success: false, error: error.message };
    }
  }

  private parseRelativeTime(timeStr: string): Date {
    const now = new Date();
    const lower = timeStr.toLowerCase().trim();

    // Parse "in X minutes/hours/days"
    const minutesMatch = lower.match(/in\s+(\d+)\s+minutes?/);
    if (minutesMatch) {
      return new Date(now.getTime() + parseInt(minutesMatch[1]) * 60000);
    }

    const hoursMatch = lower.match(/in\s+(\d+)\s+hours?/);
    if (hoursMatch) {
      return new Date(now.getTime() + parseInt(hoursMatch[1]) * 3600000);
    }

    const daysMatch = lower.match(/in\s+(\d+)\s+days?/);
    if (daysMatch) {
      return new Date(now.getTime() + parseInt(daysMatch[1]) * 86400000);
    }

    // Default to 30 minutes from now
    return new Date(now.getTime() + 30 * 60000);
  }

  private async executeEventActions(
    tenantId: string,
    actions: any[],
    contactId: string,
    eventId: string,
  ): Promise<void> {
    // This will be implemented when integrating with journeys
    // For now, just log
    this.logger.log(`Executing ${actions.length} actions for event ${eventId}`);
  }
}

