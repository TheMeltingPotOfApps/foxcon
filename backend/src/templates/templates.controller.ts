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
  ParseUUIDPipe,
} from '@nestjs/common';
import { TemplatesService } from './templates.service';
import { TemplateType } from '../entities/template.entity';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';

@Controller('templates')
@UseGuards(JwtAuthGuard, TenantGuard)
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Post()
  create(@TenantId() tenantId: string, @Body() data: any) {
    return this.templatesService.create(tenantId, data);
  }

  @Get()
  findAll(@TenantId() tenantId: string, @Query('type') type?: TemplateType) {
    return this.templatesService.findAll(tenantId, type);
  }

  @Get(':id')
  findOne(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.templatesService.findOne(tenantId, id);
  }

  @Put(':id')
  update(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: any,
  ) {
    return this.templatesService.update(tenantId, id, data);
  }

  @Delete(':id')
  delete(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.templatesService.delete(tenantId, id);
  }
}

