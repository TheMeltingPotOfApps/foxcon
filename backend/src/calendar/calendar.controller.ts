import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { CalendarEvent, CalendarEventStatus, CalendarEventType } from '../entities/calendar-event.entity';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';

@Controller('calendar')
export class CalendarController {
  constructor(private calendarService: CalendarService) {}

  @Post('events')
  async createEvent(@Body() data: any, @Request() req: any) {
    // Allow public booking - use a default tenant or require tenantId in body
    const tenantId = data.tenantId || req.user?.tenantId || '00000000-0000-0000-0000-000000000000';
    return this.calendarService.createEvent({
      ...data,
      tenantId,
    });
  }

  @Get('events')
  @UseGuards(JwtAuthGuard)
  async getEvents(
    @Query('assignedToUserId') assignedToUserId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: CalendarEventStatus,
    @Query('type') type?: CalendarEventType,
    @Query('contactId') contactId?: string,
    @TenantId() tenantId?: string,
  ) {
    try {
      if (!tenantId) {
        return [];
      }
      return await this.calendarService.getEvents({
        tenantId,
        assignedToUserId,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        status,
        type,
        contactId,
      });
    } catch (error) {
      console.error('Error in getEvents controller:', error);
      return [];
    }
  }

  @Get('events/:id')
  async getEventById(@Param('id') id: string, @Request() req: any) {
    return this.calendarService.getEventById(id, req.user?.tenantId);
  }

  @Put('events/:id')
  async updateEvent(
    @Param('id') id: string,
    @Body() updates: Partial<CalendarEvent>,
    @Request() req: any,
  ) {
    return this.calendarService.updateEvent(id, updates, req.user?.tenantId);
  }

  @Delete('events/:id')
  async cancelEvent(
    @Param('id') id: string,
    @Query('reason') reason?: string,
    @Request() req?: any,
  ) {
    return this.calendarService.cancelEvent(id, reason, req?.user?.tenantId);
  }

  @Get('available-slots')
  async getAvailableSlots(
    @Query('assignedToUserId') assignedToUserId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('durationMinutes') durationMinutes: number = 30,
  ) {
    return this.calendarService.getAvailableTimeSlots(
      assignedToUserId,
      new Date(startDate),
      new Date(endDate),
      durationMinutes,
    );
  }
}

