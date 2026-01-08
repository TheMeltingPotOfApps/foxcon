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
} from '@nestjs/common';
import { AvailabilityService } from './availability.service';
import { Availability } from '../entities/availability.entity';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';

@Controller('availability')
@UseGuards(JwtAuthGuard)
export class AvailabilityController {
  constructor(private availabilityService: AvailabilityService) {}

  @Post()
  async create(@Body() data: Partial<Availability>, @TenantId() tenantId: string) {
    return this.availabilityService.create(tenantId, data);
  }

  @Get()
  async findAll(
    @Query('eventTypeId') eventTypeId?: string,
    @TenantId() tenantId?: string,
  ) {
    return this.availabilityService.findAll(tenantId, eventTypeId);
  }

  @Get('slots')
  async getAvailableSlots(
    @Query('eventTypeId') eventTypeId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('assignedToUserId') assignedToUserId?: string,
    @TenantId() tenantId?: string,
  ) {
    return this.availabilityService.getAvailableSlots(
      tenantId,
      eventTypeId,
      new Date(startDate),
      new Date(endDate),
      assignedToUserId,
    );
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.availabilityService.findOne(tenantId, id);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() data: Partial<Availability>,
    @TenantId() tenantId: string,
  ) {
    return this.availabilityService.update(tenantId, id, data);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @TenantId() tenantId: string) {
    await this.availabilityService.delete(tenantId, id);
    return { success: true };
  }
}

