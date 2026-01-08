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
import { WebhooksService } from './webhooks.service';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';

@Controller('webhooks')
@UseGuards(JwtAuthGuard, TenantGuard)
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post()
  create(@TenantId() tenantId: string, @Body() dto: CreateWebhookDto) {
    return this.webhooksService.create(tenantId, dto);
  }

  @Get()
  findAll(@TenantId() tenantId: string) {
    return this.webhooksService.findAll(tenantId);
  }

  @Get(':id')
  findOne(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.webhooksService.findOne(tenantId, id);
  }

  @Put(':id')
  update(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<CreateWebhookDto>,
  ) {
    return this.webhooksService.update(tenantId, id, dto);
  }

  @Delete(':id')
  delete(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.webhooksService.delete(tenantId, id);
  }

  @Post(':id/test')
  test(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.webhooksService.test(tenantId, id);
  }
}

