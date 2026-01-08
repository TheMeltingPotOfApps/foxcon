import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
  Res,
  NotFoundException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { CalendarService } from './calendar.service';
import { EventTypesService } from '../event-types/event-types.service';
import { AvailabilityService } from '../availability/availability.service';
import { ContactVisitsService } from '../contacts/contact-visits.service';
import { ContactsService } from '../contacts/contacts.service';

@Controller('calendar/booking')
export class CalendarBookingController {
  constructor(
    private calendarService: CalendarService,
    private eventTypesService: EventTypesService,
    private availabilityService: AvailabilityService,
    private contactVisitsService: ContactVisitsService,
    private contactsService: ContactsService,
  ) {}

  /**
   * Public endpoint to get contact data for booking (no auth required)
   */
  @Get('contact/:contactId')
  async getContactForBooking(
    @Param('contactId') contactId: string,
    @Query('eventTypeId') eventTypeId: string,
  ) {
    try {
      console.log(`[Calendar Booking] Fetching contact ${contactId} for eventType ${eventTypeId}`);
      
      if (!eventTypeId) {
        console.warn(`[Calendar Booking] eventTypeId is missing for contact ${contactId}`);
        return null;
      }

      // Get event type to find tenant
      const eventType = await this.eventTypesService.findOnePublic(eventTypeId);
      if (!eventType) {
        console.error(`[Calendar Booking] Event type ${eventTypeId} not found`);
        throw new NotFoundException('Event type not found');
      }

      console.log(`[Calendar Booking] Found event type ${eventTypeId}, tenantId: ${eventType.tenantId}`);

      // Get contact (public access for booking purposes)
      const contact = await this.contactsService.findOne(eventType.tenantId, contactId);
      if (!contact) {
        console.error(`[Calendar Booking] Contact ${contactId} not found for tenant ${eventType.tenantId}`);
        return null; // Return null instead of throwing to allow booking without contact
      }

      // Verify tenant match
      if (contact.tenantId !== eventType.tenantId) {
        console.error(`[Calendar Booking] Contact ${contactId} tenant mismatch. Contact tenant: ${contact.tenantId}, EventType tenant: ${eventType.tenantId}`);
        return null;
      }

      console.log(`[Calendar Booking] Found contact ${contactId}:`, {
        firstName: contact.firstName,
        lastName: contact.lastName,
        email: contact.email,
        phone: contact.phoneNumber,
      });

      // Return minimal contact data needed for booking
      return {
        id: contact.id,
        firstName: contact.firstName,
        lastName: contact.lastName,
        email: contact.email,
        phone: contact.phoneNumber || contact.phone, // Support both phone and phoneNumber
        phoneNumber: contact.phoneNumber || contact.phone, // Ensure phoneNumber is available
        attributes: contact.attributes,
        tenantId: contact.tenantId, // Include tenantId for verification
      };
    } catch (error) {
      // Log the error but return null to allow booking without contact
      console.error(`[Calendar Booking] Error fetching contact ${contactId} for eventType ${eventTypeId}:`, error.message || error);
      return null;
    }
  }

  /**
   * Public endpoint to get event type details for booking
   */
  @Get('event-type/:eventTypeId')
  async getEventTypeForBooking(
    @Param('eventTypeId') eventTypeId: string,
    @Query('contactId') contactId?: string,
    @Query('leadId') leadId?: string,
    @Req() req?: Request,
  ) {
    // Get event type (public access)
    const eventType = await this.eventTypesService.findOnePublic(eventTypeId);
    if (!eventType || !eventType.isActive) {
      throw new NotFoundException('Event type not found or inactive');
    }

    // Track visit if contactId or leadId is provided
    if (contactId || leadId) {
      try {
        // If leadId is provided, try to find contact by it (treat leadId as contactId)
        const contactIdToUse = contactId || leadId;
        if (contactIdToUse) {
          const contact = await this.contactsService.findOne(eventType.tenantId, contactIdToUse);
          if (contact && contact.tenantId === eventType.tenantId) {
            await this.contactVisitsService.trackVisit({
              contactId: contact.id,
              eventTypeId,
              tenantId: eventType.tenantId,
              ipAddress: req?.ip,
              userAgent: req?.get('user-agent'),
              referrer: req?.get('referer'),
              metadata: leadId ? { leadId } : undefined,
            });
          }
        }
      } catch (error) {
        // Don't fail if visit tracking fails
        console.error('Failed to track visit:', error);
      }
    }

    // Get availability for this event type (filter by tenantId for security)
    const availabilities = await this.availabilityService.findAllForEventType(eventTypeId, eventType.tenantId);

    return {
      eventType: {
        id: eventType.id,
        name: eventType.name,
        description: eventType.description,
        durationMinutes: eventType.durationMinutes,
        tenantId: eventType.tenantId,
      },
      availabilities,
    };
  }

  /**
   * Public endpoint to get available time slots
   */
  @Get('available-slots/:eventTypeId')
  async getAvailableSlots(
    @Param('eventTypeId') eventTypeId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('assignedToUserId') assignedToUserId?: string,
    @Query('timezone') timezone?: string, // Requesting user's timezone
  ) {
    // Get event type to find tenantId
    const eventType = await this.eventTypesService.findOnePublic(eventTypeId);
    if (!eventType) {
      throw new NotFoundException('Event type not found');
    }
    
    // Get available slots - slots are returned in UTC
    // The timezone parameter helps determine the user's timezone for availability schedule
    const slots = await this.availabilityService.getAvailableSlots(
      eventType.tenantId,
      eventTypeId,
      new Date(startDate),
      new Date(endDate),
      assignedToUserId,
      timezone, // Pass timezone to availability service
    );
    return slots; // Return UTC dates - frontend will convert to user's timezone
  }

  /**
   * Public endpoint to create a booking
   */
  @Post('book')
  async createBooking(
    @Body() data: {
      eventTypeId: string;
      contactId?: string;
      leadId?: string; // Unique identifier for tracking (can be contactId or other identifier)
      startTime: string;
      endTime: string;
      attendeeName: string;
      attendeeEmail: string;
      attendeePhone?: string;
      attendeeCompany?: string;
      timezone?: string;
      tenantId?: string;
    },
    @Req() req: Request,
  ) {
    // Get event type to find tenant
    const eventType = await this.eventTypesService.findOnePublic(data.eventTypeId);
    if (!eventType) {
      throw new NotFoundException('Event type not found');
    }
    
    // Use tenantId from eventType if not provided
    const tenantId = data.tenantId || eventType.tenantId;

    // Use leadId as contactId if provided, otherwise use contactId
    // leadId is the unique identifier passed in the booking link
    let contactId = data.leadId || data.contactId;
    
    // If leadId/contactId is provided, verify the contact exists
    if (contactId) {
      try {
        const existingContact = await this.contactsService.findOne(eventType.tenantId, contactId);
        if (!existingContact || existingContact.tenantId !== eventType.tenantId) {
          // Contact not found or wrong tenant - try to find/create by phone/email
          contactId = undefined;
        }
      } catch (error) {
        // Contact not found - try to find/create by phone/email
        contactId = undefined;
      }
    }
    
    // If no contactId, try to find or create contact by phone/email
    if (!contactId && data.attendeePhone) {
      // Try to find contact by phone
      const existingContact = await this.contactsService.findByPhone(
        eventType.tenantId,
        data.attendeePhone,
      );
      if (existingContact) {
        contactId = existingContact.id;
      } else if (data.attendeeEmail) {
        // Try to find by email
        // Note: We'd need a findByEmail method, or create new contact
        const nameParts = data.attendeeName.split(' ');
        const newContact = await this.contactsService.create(eventType.tenantId, {
          phoneNumber: data.attendeePhone,
          email: data.attendeeEmail,
          firstName: nameParts[0] || '',
          lastName: nameParts.slice(1).join(' ') || '',
          attributes: data.attendeeCompany ? { company: data.attendeeCompany } : undefined,
        });
        contactId = newContact.id;
      }
    }

    // Track visit if contactId exists (use leadId for metadata tracking)
    if (contactId) {
      try {
        const visit = await this.contactVisitsService.trackVisit({
          contactId,
          eventTypeId: data.eventTypeId,
          tenantId: eventType.tenantId,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
          referrer: req.get('referer'),
          metadata: data.leadId ? { leadId: data.leadId, originalLeadId: data.leadId } : undefined,
        });

        // Update contact lead status to APPOINTMENT_SCHEDULED
        if (contactId) {
          try {
            await this.contactsService.update(tenantId, contactId, {
              leadStatus: 'APPOINTMENT_SCHEDULED' as any,
            });
          } catch (error) {
            console.error('Failed to update contact lead status:', error);
            // Don't fail booking if status update fails
          }
        }

        // Create the event
        // startTime and endTime should be in UTC or include timezone info
        // If timezone is provided, the calendar service will handle conversion
        const event = await this.calendarService.createEvent({
          title: `${eventType.name} - ${data.attendeeName}`,
          description: `Scheduled via public booking page`,
          type: 'SALES_CALL' as any,
          startTime: data.startTime, // Can be ISO string or Date
          endTime: data.endTime, // Can be ISO string or Date
          attendeeName: data.attendeeName,
          attendeeEmail: data.attendeeEmail,
          attendeePhone: data.attendeePhone,
          attendeeCompany: data.attendeeCompany,
          timezone: data.timezone, // Timezone of the provided startTime/endTime
          tenantId: tenantId,
          eventTypeId: data.eventTypeId,
          contactId: contactId,
        });

        // Update visit with scheduled event time
        await this.contactVisitsService.updateVisitWithScheduledEvent(
          visit.id,
          new Date(data.startTime),
        );

        return {
          success: true,
          event,
          visit,
        };
      } catch (error) {
        console.error('Failed to create booking:', error);
        throw error;
      }
    } else {
      // Create event without contact tracking
      const event = await this.calendarService.createEvent({
        title: `${eventType.name} - ${data.attendeeName}`,
        description: `Scheduled via public booking page`,
        type: 'SALES_CALL' as any,
        startTime: data.startTime, // Can be ISO string or Date
        endTime: data.endTime, // Can be ISO string or Date
        attendeeName: data.attendeeName,
        attendeeEmail: data.attendeeEmail,
        attendeePhone: data.attendeePhone,
        attendeeCompany: data.attendeeCompany,
        timezone: data.timezone, // Timezone of the provided startTime/endTime
        tenantId: tenantId,
        eventTypeId: data.eventTypeId,
      });

      return {
        success: true,
        event,
      };
    }
  }

  /**
   * Track a visit to the booking page (separate endpoint for better tracking)
   */
  @Post('track-visit')
  async trackVisit(
    @Body() data: {
      contactId: string;
      eventTypeId: string;
      tenantId: string;
    },
    @Req() req: Request,
  ) {
    try {
      const visit = await this.contactVisitsService.trackVisit({
        contactId: data.contactId,
        eventTypeId: data.eventTypeId,
        tenantId: data.tenantId,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        referrer: req.get('referer'),
      });
      return { success: true, visit };
    } catch (error) {
      console.error('Failed to track visit:', error);
      return { success: false, error: error.message };
    }
  }
}

