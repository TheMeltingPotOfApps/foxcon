import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { CallSession } from '../../entities/call-session.entity';
import { CallLog } from '../../entities/call-log.entity';
import { AgentExtension } from '../../entities/agent-extension.entity';
import { Contact } from '../../entities/contact.entity';
import { CallSessionStatus } from '../../entities/call-session-status.enum';
import { CallDisposition } from '../../entities/call-log.entity';
import { UpdateCallNotesDto } from '../dto/call-control.dto';

@Injectable()
export class CallSessionsService {
  private readonly logger = new Logger(CallSessionsService.name);

  constructor(
    @InjectRepository(CallSession)
    private callSessionRepository: Repository<CallSession>,
    @InjectRepository(CallLog)
    private callLogRepository: Repository<CallLog>,
    @InjectRepository(AgentExtension)
    private agentExtensionRepository: Repository<AgentExtension>,
    @InjectRepository(Contact)
    private contactRepository: Repository<Contact>,
  ) {}

  async create(
    tenantId: string,
    callLogId: string,
    agentId?: string,
    contactId?: string,
  ): Promise<CallSession> {
    const callLog = await this.callLogRepository.findOne({
      where: { id: callLogId, tenantId },
    });

    if (!callLog) {
      throw new NotFoundException(`Call log not found: ${callLogId}`);
    }

    const callSession = this.callSessionRepository.create({
      tenantId,
      callLogId,
      agentId,
      contactId,
      status: CallSessionStatus.INITIATED,
      startedAt: new Date(),
      metadata: {},
    });

    return await this.callSessionRepository.save(callSession);
  }

  async findOne(tenantId: string, id: string): Promise<CallSession> {
    const session = await this.callSessionRepository.findOne({
      where: { id, tenantId },
      relations: ['callLog', 'agent', 'contact'],
    });

    if (!session) {
      throw new NotFoundException(`Call session not found: ${id}`);
    }

    return session;
  }

  async findByCallLog(
    tenantId: string,
    callLogId: string,
  ): Promise<CallSession | null> {
    return await this.callSessionRepository.findOne({
      where: { callLogId, tenantId },
      relations: ['callLog', 'agent', 'contact'],
      order: { createdAt: 'DESC' },
    });
  }

  async findActiveByAgent(
    tenantId: string,
    agentId: string,
  ): Promise<CallSession | null> {
    return await this.callSessionRepository.findOne({
      where: {
        tenantId,
        agentId,
        status: In([
          CallSessionStatus.RINGING,
          CallSessionStatus.CONNECTED,
          CallSessionStatus.ON_HOLD,
        ]),
      },
      relations: ['callLog', 'contact'],
      order: { createdAt: 'DESC' },
    });
  }

  async updateStatus(
    tenantId: string,
    id: string,
    status: CallSessionStatus,
  ): Promise<CallSession> {
    const session = await this.findOne(tenantId, id);
    session.status = status;

    if (status === CallSessionStatus.CONNECTED && !session.answeredAt) {
      session.answeredAt = new Date();
    }

    if (status === CallSessionStatus.ENDED && !session.endedAt) {
      session.endedAt = new Date();
      if (session.answeredAt) {
        session.duration = Math.floor(
          (session.endedAt.getTime() - session.answeredAt.getTime()) / 1000,
        );
      }
    }

    return await this.callSessionRepository.save(session);
  }

  async assignAgent(
    tenantId: string,
    id: string,
    agentId: string,
  ): Promise<CallSession> {
    const session = await this.findOne(tenantId, id);
    session.agentId = agentId;
    return await this.callSessionRepository.save(session);
  }

  async updateNotes(
    tenantId: string,
    id: string,
    dto: UpdateCallNotesDto,
  ): Promise<CallSession> {
    const session = await this.findOne(tenantId, id);

    if (dto.notes !== undefined) {
      session.notes = dto.notes;
    }

    if (dto.disposition !== undefined) {
      session.disposition = dto.disposition as CallDisposition;
    }

    return await this.callSessionRepository.save(session);
  }

  async addTransferHistory(
    tenantId: string,
    id: string,
    from: string,
    to: string,
  ): Promise<CallSession> {
    const session = await this.findOne(tenantId, id);

    if (!session.metadata) {
      session.metadata = {};
    }

    if (!session.metadata.transferHistory) {
      session.metadata.transferHistory = [];
    }

    session.metadata.transferHistory.push({
      from,
      to,
      timestamp: new Date(),
    });

    return await this.callSessionRepository.save(session);
  }

  async findAll(
    tenantId: string,
    options: {
      agentId?: string;
      status?: CallSessionStatus;
      limit?: number;
      offset?: number;
    } = {},
  ): Promise<{ data: CallSession[]; total: number }> {
    const { agentId, status, limit = 50, offset = 0 } = options;

    const queryBuilder = this.callSessionRepository
      .createQueryBuilder('session')
      .where('session.tenantId = :tenantId', { tenantId })
      .leftJoinAndSelect('session.callLog', 'callLog')
      .leftJoinAndSelect('session.agent', 'agent')
      .leftJoinAndSelect('session.contact', 'contact')
      .orderBy('session.createdAt', 'DESC')
      .skip(offset)
      .take(limit);

    if (agentId) {
      queryBuilder.andWhere('session.agentId = :agentId', { agentId });
    }

    if (status) {
      queryBuilder.andWhere('session.status = :status', { status });
    }

    const [data, total] = await queryBuilder.getManyAndCount();

    return { data, total };
  }
}

