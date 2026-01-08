import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AgentExtension } from '../../entities/agent-extension.entity';
import { CallSession } from '../../entities/call-session.entity';
import { CallLog, CallStatus } from '../../entities/call-log.entity';
import { Contact } from '../../entities/contact.entity';
import { AgentStatus } from '../../entities/agent-status.enum';
import { CallSessionStatus } from '../../entities/call-session-status.enum';
import { AgentActivityType } from '../../entities/agent-activity-type.enum';
import { AgentActivityLog } from '../../entities/agent-activity-log.entity';
import { AmiService } from '../../asterisk/ami.service';
import { CallsService } from '../../asterisk/calls.service';
import { AgentExtensionsService } from './agent-extensions.service';
import { CallSessionsService } from './call-sessions.service';
import { CallRoutingService } from './call-routing.service';
import { PhoneFormatter } from '../../utils/phone-formatter';

@Injectable()
export class PbxService {
  private readonly logger = new Logger(PbxService.name);

  constructor(
    @InjectRepository(AgentExtension)
    private agentExtensionRepository: Repository<AgentExtension>,
    @InjectRepository(CallSession)
    private callSessionRepository: Repository<CallSession>,
    @InjectRepository(CallLog)
    private callLogRepository: Repository<CallLog>,
    @InjectRepository(Contact)
    private contactRepository: Repository<Contact>,
    @InjectRepository(AgentActivityLog)
    private activityLogRepository: Repository<AgentActivityLog>,
    private amiService: AmiService,
    private callsService: CallsService,
    private agentExtensionsService: AgentExtensionsService,
    private callSessionsService: CallSessionsService,
    private callRoutingService: CallRoutingService,
  ) {}

  async dialOutbound(
    tenantId: string,
    agentId: string,
    phoneNumber: string,
    contactId?: string,
  ): Promise<{ callSession: CallSession; callLog: CallLog }> {
    // Get agent extension
    const agentExtension = await this.agentExtensionsService.findByUserId(
      tenantId,
      agentId,
    );

    if (!agentExtension) {
      throw new NotFoundException('Agent extension not found');
    }

    if (agentExtension.status !== AgentStatus.AVAILABLE) {
      throw new BadRequestException('Agent is not available');
    }

    // Check if agent already has an active call
    const activeCall = await this.callSessionsService.findActiveByAgent(
      tenantId,
      agentId,
    );

    if (activeCall) {
      throw new BadRequestException('Agent is already on a call');
    }

    // Find or create contact
    let contact: Contact | null = null;
    if (contactId) {
      contact = await this.contactRepository.findOne({
        where: { id: contactId, tenantId },
      });
    } else {
      // Try to find by phone number
      const formattedPhone = PhoneFormatter.formatToE164(phoneNumber);
      contact = await this.contactRepository.findOne({
        where: { phoneNumber: formattedPhone, tenantId },
      });
    }

    // Create call log
    const callLog = await this.callLogRepository.save({
      tenantId,
      from: agentExtension.extension, // Use extension as caller ID
      to: phoneNumber,
      status: CallStatus.INITIATED,
      callStatus: CallStatus.INITIATED,
      context: 'pbx-outbound',
    });

    // Create call session
    const callSession = await this.callSessionsService.create(
      tenantId,
      callLog.id,
      agentId,
      contact?.id,
    );

    // Update agent status
    await this.agentExtensionsService.updateStatus(
      tenantId,
      agentExtension.id,
      AgentStatus.ON_CALL,
    );

    await this.agentExtensionsService.setCurrentCall(
      tenantId,
      agentExtension.id,
      callSession.id,
    );

    // Log activity
    await this.logActivity(tenantId, agentId, AgentActivityType.CALL_STARTED, {
      callId: callSession.id,
    });

    // Initiate call via Asterisk
    try {
      // TODO: Implement actual Asterisk call origination for agent
      // This would use AMI to originate a call from the agent extension
      this.logger.log(
        `Initiating outbound call from agent ${agentExtension.extension} to ${phoneNumber}`,
      );
    } catch (error) {
      this.logger.error(`Failed to initiate call: ${error.message}`);
      // Update session status to failed
      await this.callSessionsService.updateStatus(
        tenantId,
        callSession.id,
        CallSessionStatus.ENDED,
      );
      throw error;
    }

    return { callSession, callLog };
  }

  async answerCall(
    tenantId: string,
    agentId: string,
    callSessionId: string,
  ): Promise<CallSession> {
    const callSession = await this.callSessionsService.findOne(
      tenantId,
      callSessionId,
    );

    if (callSession.agentId !== agentId) {
      throw new BadRequestException('Call is not assigned to this agent');
    }

    if (callSession.status !== CallSessionStatus.RINGING) {
      throw new BadRequestException('Call is not in ringing state');
    }

    // Update session status
    await this.callSessionsService.updateStatus(
      tenantId,
      callSessionId,
      CallSessionStatus.CONNECTED,
    );

    // Update agent status
    const agentExtension = await this.agentExtensionsService.findByUserId(
      tenantId,
      agentId,
    );

    if (agentExtension) {
      await this.agentExtensionsService.updateStatus(
        tenantId,
        agentExtension.id,
        AgentStatus.ON_CALL,
      );
    }

    // Log activity
    await this.logActivity(tenantId, agentId, AgentActivityType.CALL_STARTED, {
      callId: callSessionId,
    });

    return callSession;
  }

  async hangupCall(
    tenantId: string,
    agentId: string,
    callSessionId: string,
  ): Promise<CallSession> {
    const callSession = await this.callSessionsService.findOne(
      tenantId,
      callSessionId,
    );

    if (callSession.agentId !== agentId) {
      throw new BadRequestException('Call is not assigned to this agent');
    }

    // Update session status
    await this.callSessionsService.updateStatus(
      tenantId,
      callSessionId,
      CallSessionStatus.ENDED,
    );

    // Update agent status
    const agentExtension = await this.agentExtensionsService.findByUserId(
      tenantId,
      agentId,
    );

    if (agentExtension) {
      await this.agentExtensionsService.updateStatus(
        tenantId,
        agentExtension.id,
        AgentStatus.WRAP_UP,
      );

      await this.agentExtensionsService.setCurrentCall(
        tenantId,
        agentExtension.id,
        null,
      );

      // Auto-set back to available after wrap-up time
      const wrapUpTime = agentExtension.settings?.wrapUpTime || 30;
      setTimeout(async () => {
        const updated = await this.agentExtensionsService.findOne(
          tenantId,
          agentExtension.id,
        );
        if (updated.status === AgentStatus.WRAP_UP && !updated.currentCallId) {
          await this.agentExtensionsService.updateStatus(
            tenantId,
            agentExtension.id,
            AgentStatus.AVAILABLE,
          );
        }
      }, wrapUpTime * 1000);
    }

    // Log activity
    await this.logActivity(tenantId, agentId, AgentActivityType.CALL_ENDED, {
      callId: callSessionId,
      duration: callSession.duration,
    });

    return callSession;
  }

  async routeInboundCall(
    tenantId: string,
    callLogId: string,
    queueId?: string,
  ): Promise<CallSession> {
    // Find available agent
    let agentExtension: AgentExtension | null = null;

    if (queueId) {
      agentExtension = await this.callRoutingService.findAvailableAgentForQueue(
        tenantId,
        queueId,
      );
    } else {
      // Default: find any available agent
      const agents = await this.agentExtensionsService.getAvailableAgents(
        tenantId,
      );
      agentExtension = agents[0] || null;
    }

    if (!agentExtension) {
      // No available agents - create session but mark as waiting
      const callSession = await this.callSessionsService.create(
        tenantId,
        callLogId,
      );
      await this.callSessionsService.updateStatus(
        tenantId,
        callSession.id,
        CallSessionStatus.RINGING,
      );
      return callSession;
    }

    // Create call session and assign to agent
    const callSession = await this.callSessionsService.create(
      tenantId,
      callLogId,
      agentExtension.userId,
    );

    await this.callSessionsService.updateStatus(
      tenantId,
      callSession.id,
      CallSessionStatus.RINGING,
    );

    // Update agent status
    await this.agentExtensionsService.updateStatus(
      tenantId,
      agentExtension.id,
      AgentStatus.ON_CALL,
    );

    await this.agentExtensionsService.setCurrentCall(
      tenantId,
      agentExtension.id,
      callSession.id,
    );

    return callSession;
  }

  private async logActivity(
    tenantId: string,
    agentId: string,
    activityType: AgentActivityType,
    metadata?: any,
  ): Promise<void> {
    const log = this.activityLogRepository.create({
      tenantId,
      agentId,
      activityType,
      metadata,
    });
    await this.activityLogRepository.save(log);
  }
}

