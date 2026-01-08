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
import { ContactsService } from './contacts.service';
import { ContactVisitsService } from './contact-visits.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { Contact } from '../entities/contact.entity';

@Controller('contacts')
@UseGuards(JwtAuthGuard, TenantGuard)
export class ContactsController {
  constructor(
    private readonly contactsService: ContactsService,
    private readonly contactVisitsService: ContactVisitsService,
  ) {}

  @Post()
  async create(
    @TenantId() tenantId: string,
    @Body() data: Partial<Contact>,
  ) {
    return this.contactsService.create(tenantId, data);
  }

  @Get()
  async findAll(
    @TenantId() tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
    @Query('search') search?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.contactsService.findAll(
      tenantId,
      pageNum,
      limitNum,
      sortBy || 'createdAt',
      sortOrder || 'DESC',
      search,
    );
  }

  @Get(':id')
  async findOne(
    @TenantId() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.contactsService.findOne(tenantId, id);
  }

  @Put(':id')
  async update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() data: Partial<Contact>,
  ) {
    return this.contactsService.update(tenantId, id, data);
  }

  @Put(':id/status')
  async updateStatus(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() body: { leadStatus: string },
  ) {
    return this.contactsService.updateStatus(tenantId, id, body.leadStatus);
  }

  @Get(':id/timeline')
  async getTimeline(
    @TenantId() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.contactsService.getTimeline(tenantId, id);
  }

  @Delete(':id')
  async delete(
    @TenantId() tenantId: string,
    @Param('id') id: string,
  ) {
    await this.contactsService.delete(tenantId, id);
    return { success: true };
  }

  @Get(':id/visits')
  async getContactVisits(
    @TenantId() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.contactVisitsService.getContactVisits(id, tenantId);
  }
}

