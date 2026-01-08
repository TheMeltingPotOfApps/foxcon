import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';

@Controller('conversations')
@UseGuards(JwtAuthGuard, TenantGuard)
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get()
  findAll(
    @TenantId() tenantId: string,
    @Query('status') status?: string,
    @Query('contactId') contactId?: string,
  ) {
    return this.conversationsService.findAll(tenantId, { status, contactId });
  }

  @Get(':id')
  findOne(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.conversationsService.findOne(tenantId, id);
  }

  @Post(':id/messages')
  sendMessage(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) conversationId: string,
    @Body() body: { body: string; messageType?: 'SMS' | 'IMESSAGE' },
  ) {
    const messageType = body.messageType === 'IMESSAGE' ? 'IMESSAGE' : 'SMS';
    return this.conversationsService.sendMessage(
      tenantId,
      conversationId,
      body.body,
      messageType as any,
    );
  }

  @Post(':id/close')
  closeConversation(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.conversationsService.closeConversation(tenantId, id);
  }
}

