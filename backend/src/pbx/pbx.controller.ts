import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PbxService } from './services/pbx.service';
import { AgentExtensionsService } from './services/agent-extensions.service';
import { CallSessionsService } from './services/call-sessions.service';
import { CallRoutingService } from './services/call-routing.service';
import { DialCallDto } from './dto/call-dial.dto';
import {
  AnswerCallDto,
  HangupCallDto,
  HoldCallDto,
  MuteCallDto,
  TransferCallDto,
  UpdateCallNotesDto,
} from './dto/call-control.dto';
import { UpdateAgentStatusDto } from './dto/agent-status.dto';
import { CreateQueueDto, UpdateQueueDto } from './dto/queue.dto';
import {
  CreateAgentExtensionDto,
  UpdateAgentExtensionDto,
} from './dto/agent-extension.dto';

@Controller('pbx')
@UseGuards(JwtAuthGuard, TenantGuard)
export class PbxController {
  constructor(
    private pbxService: PbxService,
    private agentExtensionsService: AgentExtensionsService,
    private callSessionsService: CallSessionsService,
    private callRoutingService: CallRoutingService,
  ) {}

  // Agent Extension Endpoints
  @Post('agent-extensions')
  async createAgentExtension(
    @TenantId() tenantId: string,
    @Body() dto: CreateAgentExtensionDto,
  ) {
    return await this.agentExtensionsService.create(tenantId, dto);
  }

  @Get('agent-extensions')
  async getAgentExtensions(@TenantId() tenantId: string) {
    return await this.agentExtensionsService.findAll(tenantId);
  }

  @Get('agent-extensions/:id')
  async getAgentExtension(
    @TenantId() tenantId: string,
    @Param('id') id: string,
  ) {
    return await this.agentExtensionsService.findOne(tenantId, id);
  }

  @Put('agent-extensions/:id')
  async updateAgentExtension(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAgentExtensionDto,
  ) {
    return await this.agentExtensionsService.update(tenantId, id, dto);
  }

  @Put('agent-extensions/:id/status')
  async updateAgentStatus(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAgentStatusDto,
  ) {
    return await this.agentExtensionsService.updateStatus(
      tenantId,
      id,
      dto.status,
    );
  }

  @Delete('agent-extensions/:id')
  async deleteAgentExtension(
    @TenantId() tenantId: string,
    @Param('id') id: string,
  ) {
    await this.agentExtensionsService.delete(tenantId, id);
    return { success: true };
  }

  // Call Endpoints
  @Post('calls/dial')
  async dialCall(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Body() dto: DialCallDto,
  ) {
    return await this.pbxService.dialOutbound(
      tenantId,
      user.userId || user.sub,
      dto.phoneNumber,
      dto.contactId,
    );
  }

  @Post('calls/:callId/answer')
  async answerCall(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Param('callId') callId: string,
  ) {
    return await this.pbxService.answerCall(tenantId, user.userId, callId);
  }

  @Post('calls/:callId/hangup')
  async hangupCall(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Param('callId') callId: string,
  ) {
    return await this.pbxService.hangupCall(tenantId, user.userId, callId);
  }

  @Post('calls/:callId/hold')
  async holdCall(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Param('callId') callId: string,
    @Body() dto: HoldCallDto,
  ) {
    // TODO: Implement hold functionality via AMI
    return { success: true, message: 'Hold functionality to be implemented' };
  }

  @Post('calls/:callId/mute')
  async muteCall(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Param('callId') callId: string,
    @Body() dto: MuteCallDto,
  ) {
    // TODO: Implement mute functionality via AMI
    return { success: true, message: 'Mute functionality to be implemented' };
  }

  @Post('calls/:callId/transfer')
  async transferCall(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Param('callId') callId: string,
    @Body() dto: TransferCallDto,
  ) {
    // TODO: Implement transfer functionality via AMI
    return { success: true, message: 'Transfer functionality to be implemented' };
  }

  @Put('calls/:callId/notes')
  async updateCallNotes(
    @TenantId() tenantId: string,
    @Param('callId') callId: string,
    @Body() dto: UpdateCallNotesDto,
  ) {
    return await this.callSessionsService.updateNotes(tenantId, callId, dto);
  }

  @Get('calls/sessions')
  async getCallSessions(
    @TenantId() tenantId: string,
    @Query('agentId') agentId?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return await this.callSessionsService.findAll(tenantId, {
      agentId,
      status: status as any,
      limit: limit ? parseInt(limit.toString()) : undefined,
      offset: offset ? parseInt(offset.toString()) : undefined,
    });
  }

  @Get('calls/sessions/:id')
  async getCallSession(
    @TenantId() tenantId: string,
    @Param('id') id: string,
  ) {
    return await this.callSessionsService.findOne(tenantId, id);
  }

  // Queue Endpoints
  @Post('queues')
  async createQueue(
    @TenantId() tenantId: string,
    @Body() dto: CreateQueueDto,
  ) {
    return await this.callRoutingService.createQueue(tenantId, dto);
  }

  @Get('queues')
  async getQueues(@TenantId() tenantId: string) {
    return await this.callRoutingService.findAllQueues(tenantId);
  }

  @Get('queues/:id')
  async getQueue(@TenantId() tenantId: string, @Param('id') id: string) {
    return await this.callRoutingService.findQueue(tenantId, id);
  }

  @Get('queues/:id/status')
  async getQueueStatus(
    @TenantId() tenantId: string,
    @Param('id') id: string,
  ) {
    return await this.callRoutingService.getQueueStatus(tenantId, id);
  }

  @Put('queues/:id')
  async updateQueue(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateQueueDto,
  ) {
    return await this.callRoutingService.updateQueue(tenantId, id, dto);
  }

  @Delete('queues/:id')
  async deleteQueue(@TenantId() tenantId: string, @Param('id') id: string) {
    await this.callRoutingService.deleteQueue(tenantId, id);
    return { success: true };
  }
}

