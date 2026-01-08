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
import { ContentAiService } from './content-ai.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';

@Controller('content-ai-templates')
@UseGuards(JwtAuthGuard, TenantGuard)
export class ContentAiController {
  constructor(private readonly contentAiService: ContentAiService) {}

  @Post()
  create(@TenantId() tenantId: string, @Body() data: any) {
    return this.contentAiService.create(tenantId, data);
  }

  @Get()
  findAll(@TenantId() tenantId: string) {
    return this.contentAiService.findAll(tenantId);
  }

  @Get(':id')
  findOne(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.contentAiService.findOne(tenantId, id);
  }

  @Put(':id')
  update(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: any,
  ) {
    return this.contentAiService.update(tenantId, id, data);
  }

  @Delete(':id')
  delete(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.contentAiService.delete(tenantId, id);
  }

  @Post(':id/generate-variations')
  async generateVariations(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return await this.contentAiService.generateVariations(tenantId, id);
  }

  @Post(':id/generate-unique')
  generateUnique(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() context?: { contact?: any; journey?: any; previousMessages?: string[] },
  ) {
    return this.contentAiService.generateUniqueMessage(tenantId, id, context);
  }

  @Get(':id/random-variation')
  getRandomVariation(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.contentAiService.getRandomVariation(tenantId, id);
  }

}

