import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { CallQueue } from '../../entities/call-queue.entity';
import { AgentExtension } from '../../entities/agent-extension.entity';
import { CallSession } from '../../entities/call-session.entity';
import { AgentStatus } from '../../entities/agent-status.enum';
import { CallSessionStatus } from '../../entities/call-session-status.enum';
import { CreateQueueDto, UpdateQueueDto } from '../dto/queue.dto';

@Injectable()
export class CallRoutingService {
  private readonly logger = new Logger(CallRoutingService.name);

  constructor(
    @InjectRepository(CallQueue)
    private callQueueRepository: Repository<CallQueue>,
    @InjectRepository(AgentExtension)
    private agentExtensionRepository: Repository<AgentExtension>,
    @InjectRepository(CallSession)
    private callSessionRepository: Repository<CallSession>,
  ) {}

  async createQueue(tenantId: string, dto: CreateQueueDto): Promise<CallQueue> {
    // Check if queue number already exists
    const existing = await this.callQueueRepository.findOne({
      where: { queueNumber: dto.queueNumber, tenantId },
    });

    if (existing) {
      throw new BadRequestException(
        `Queue number ${dto.queueNumber} already exists`,
      );
    }

    const queue = this.callQueueRepository.create({
      tenantId,
      name: dto.name,
      queueNumber: dto.queueNumber,
      agentIds: dto.agentIds || [],
      isActive: true,
      settings: dto.settings || {},
    });

    return await this.callQueueRepository.save(queue);
  }

  async findAllQueues(tenantId: string): Promise<CallQueue[]> {
    try {
      return await this.callQueueRepository.find({
        where: { tenantId },
        order: { name: 'ASC' },
      });
    } catch (error: any) {
      // If table doesn't exist yet, return empty array
      if (error.message?.includes('does not exist') || error.code === '42P01') {
        this.logger.warn('CallQueue table does not exist yet. Please run migrations.');
        return [];
      }
      throw error;
    }
  }

  async findQueue(tenantId: string, id: string): Promise<CallQueue> {
    const queue = await this.callQueueRepository.findOne({
      where: { id, tenantId },
    });

    if (!queue) {
      throw new NotFoundException(`Queue not found: ${id}`);
    }

    return queue;
  }

  async updateQueue(
    tenantId: string,
    id: string,
    dto: UpdateQueueDto,
  ): Promise<CallQueue> {
    const queue = await this.findQueue(tenantId, id);

    if (dto.name !== undefined) {
      queue.name = dto.name;
    }

    if (dto.isActive !== undefined) {
      queue.isActive = dto.isActive;
    }

    if (dto.agentIds !== undefined) {
      queue.agentIds = dto.agentIds;
    }

    if (dto.settings !== undefined) {
      queue.settings = {
        ...queue.settings,
        ...dto.settings,
      };
    }

    return await this.callQueueRepository.save(queue);
  }

  async deleteQueue(tenantId: string, id: string): Promise<void> {
    const queue = await this.findQueue(tenantId, id);
    await this.callQueueRepository.remove(queue);
  }

  async findAvailableAgentForQueue(
    tenantId: string,
    queueId: string,
  ): Promise<AgentExtension | null> {
    const queue = await this.findQueue(tenantId, queueId);

    if (!queue.isActive || queue.agentIds.length === 0) {
      return null;
    }

    // Get agents assigned to this queue
    const agents = await this.agentExtensionRepository.find({
      where: {
        tenantId,
        userId: In(queue.agentIds),
        status: AgentStatus.AVAILABLE,
        isActive: true,
      },
      relations: ['user'],
    });

    if (agents.length === 0) {
      return null;
    }

    // Simple routing: least recent (first available)
    // TODO: Implement more sophisticated routing strategies
    const ringStrategy = queue.settings?.ringStrategy || 'leastrecent';

    switch (ringStrategy) {
      case 'fewestcalls':
        // Find agent with fewest active calls
        const agentsWithCallCounts = await Promise.all(
          agents.map(async (agent) => {
            const callCount = await this.callSessionRepository.count({
              where: {
                agentId: agent.userId,
                status: In([
                  CallSessionStatus.CONNECTED,
                  CallSessionStatus.RINGING,
                ]),
              },
            });
            return { agent, callCount };
          }),
        );
        agentsWithCallCounts.sort((a, b) => a.callCount - b.callCount);
        return agentsWithCallCounts[0]?.agent || null;

      case 'random':
        return agents[Math.floor(Math.random() * agents.length)];

      case 'ringall':
        // Return all agents, caller will be routed to first to answer
        return agents[0];

      case 'leastrecent':
      default:
        // Return first available agent
        return agents[0];
    }
  }

  async getQueueStatus(tenantId: string, queueId: string): Promise<{
    waiting: number;
    agents: number;
    longestWait: number;
  }> {
    const queue = await this.findQueue(tenantId, queueId);

    // Count waiting calls (sessions in RINGING status)
    const waiting = await this.callSessionRepository.count({
      where: {
        tenantId,
        status: CallSessionStatus.RINGING,
        // TODO: Add queue association to call sessions
      },
    });

    // Count active agents in queue
    const agents = await this.agentExtensionRepository.count({
      where: {
        tenantId,
        userId: In(queue.agentIds),
        status: In([AgentStatus.AVAILABLE, AgentStatus.ON_CALL]),
        isActive: true,
      },
    });

    // TODO: Calculate longest wait time
    const longestWait = 0;

    return {
      waiting,
      agents,
      longestWait,
    };
  }
}

