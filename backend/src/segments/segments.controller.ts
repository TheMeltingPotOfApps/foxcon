import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { SegmentsService } from './segments.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';

@Controller('segments')
@UseGuards(JwtAuthGuard, TenantGuard)
export class SegmentsController {
  constructor(private readonly segmentsService: SegmentsService) {}

  @Post()
  create(@TenantId() tenantId: string, @Body() body: { name: string; description?: string; criteria?: any }) {
    return this.segmentsService.create(tenantId, body);
  }

  @Post('count-matching')
  async countMatching(@TenantId() tenantId: string, @Body() body: { criteria?: any }) {
    const count = await this.segmentsService.countMatchingContacts(tenantId, body.criteria || {});
    return { count };
  }

  @Get()
  findAll(@TenantId() tenantId: string) {
    return this.segmentsService.findAll(tenantId);
  }

  @Get(':id')
  findOne(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.segmentsService.findOne(tenantId, id);
  }

  @Put(':id')
  update(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { name?: string; description?: string; criteria?: any },
  ) {
    return this.segmentsService.update(tenantId, id, body);
  }

  @Delete(':id')
  delete(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.segmentsService.delete(tenantId, id);
  }
}

