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
import { AiTemplatesService } from './ai-templates.service';
import { CreateAiTemplateDto } from './dto/create-ai-template.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';

@Controller('ai-templates')
@UseGuards(JwtAuthGuard, TenantGuard)
export class AiTemplatesController {
  constructor(private readonly aiTemplatesService: AiTemplatesService) {}

  @Post()
  create(@TenantId() tenantId: string, @Body() dto: CreateAiTemplateDto) {
    return this.aiTemplatesService.create(tenantId, dto);
  }

  @Get()
  findAll(@TenantId() tenantId: string) {
    return this.aiTemplatesService.findAll(tenantId);
  }

  @Get(':id')
  findOne(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.aiTemplatesService.findOne(tenantId, id);
  }

  @Put(':id')
  update(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<CreateAiTemplateDto>,
  ) {
    return this.aiTemplatesService.update(tenantId, id, dto);
  }

  @Delete(':id')
  delete(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.aiTemplatesService.delete(tenantId, id);
  }
}

