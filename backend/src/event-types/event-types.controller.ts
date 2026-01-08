import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { EventTypesService } from './event-types.service';
import { EventType } from '../entities/event-type.entity';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';

@Controller('event-types')
@UseGuards(JwtAuthGuard)
export class EventTypesController {
  constructor(private eventTypesService: EventTypesService) {}

  @Post()
  async create(@Body() data: Partial<EventType>, @TenantId() tenantId: string) {
    return this.eventTypesService.create(tenantId, data);
  }

  @Get()
  async findAll(@TenantId() tenantId: string) {
    return this.eventTypesService.findAll(tenantId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.eventTypesService.findOne(tenantId, id);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() data: Partial<EventType>,
    @TenantId() tenantId: string,
  ) {
    return this.eventTypesService.update(tenantId, id, data);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @TenantId() tenantId: string) {
    await this.eventTypesService.delete(tenantId, id);
    return { success: true };
  }
}

