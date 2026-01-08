import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AgentExtension } from '../../entities/agent-extension.entity';
import { User } from '../../entities/user.entity';
import { AgentStatus } from '../../entities/agent-status.enum';
import { CreateAgentExtensionDto, UpdateAgentExtensionDto } from '../dto/agent-extension.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AgentExtensionsService {
  private readonly logger = new Logger(AgentExtensionsService.name);

  constructor(
    @InjectRepository(AgentExtension)
    private agentExtensionRepository: Repository<AgentExtension>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async create(
    tenantId: string,
    dto: CreateAgentExtensionDto,
  ): Promise<AgentExtension> {
    // Check if user exists
    const user = await this.userRepository.findOne({
      where: { id: dto.userId },
    });

    if (!user) {
      throw new NotFoundException(`User not found: ${dto.userId}`);
    }

    // Check if extension already exists for this tenant
    const existing = await this.agentExtensionRepository.findOne({
      where: { extension: dto.extension, tenantId },
    });

    if (existing) {
      throw new BadRequestException(
        `Extension ${dto.extension} already exists for this tenant`,
      );
    }

    // Hash SIP password
    const hashedPassword = await bcrypt.hash(dto.sipPassword, 10);

    // Generate SIP username (usually same as extension)
    const sipUsername = `agent-${dto.extension}`;
    const sipEndpoint = `agent-${dto.extension}`;

    const agentExtension = this.agentExtensionRepository.create({
      tenantId,
      userId: dto.userId,
      extension: dto.extension,
      sipUsername,
      sipPassword: hashedPassword,
      sipEndpoint,
      isActive: true,
      status: AgentStatus.OFFLINE,
      settings: dto.settings || {},
    });

    return await this.agentExtensionRepository.save(agentExtension);
  }

  async findAll(tenantId: string): Promise<AgentExtension[]> {
    try {
      return await this.agentExtensionRepository.find({
        where: { tenantId },
        relations: ['user'],
        order: { extension: 'ASC' },
      });
    } catch (error: any) {
      // If table doesn't exist yet, return empty array
      if (error.message?.includes('does not exist') || error.code === '42P01') {
        this.logger.warn('AgentExtension table does not exist yet. Please run migrations.');
        return [];
      }
      throw error;
    }
  }

  async findOne(tenantId: string, id: string): Promise<AgentExtension> {
    const agentExtension = await this.agentExtensionRepository.findOne({
      where: { id, tenantId },
      relations: ['user'],
    });

    if (!agentExtension) {
      throw new NotFoundException(`Agent extension not found: ${id}`);
    }

    return agentExtension;
  }

  async findByExtension(
    tenantId: string,
    extension: string,
  ): Promise<AgentExtension | null> {
    return await this.agentExtensionRepository.findOne({
      where: { extension, tenantId },
      relations: ['user'],
    });
  }

  async findByUserId(
    tenantId: string,
    userId: string,
  ): Promise<AgentExtension | null> {
    return await this.agentExtensionRepository.findOne({
      where: { userId, tenantId },
      relations: ['user'],
    });
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateAgentExtensionDto,
  ): Promise<AgentExtension> {
    const agentExtension = await this.findOne(tenantId, id);

    if (dto.sipPassword) {
      agentExtension.sipPassword = await bcrypt.hash(dto.sipPassword, 10);
    }

    if (dto.isActive !== undefined) {
      agentExtension.isActive = dto.isActive;
    }

    if (dto.settings) {
      agentExtension.settings = {
        ...agentExtension.settings,
        ...dto.settings,
      };
    }

    return await this.agentExtensionRepository.save(agentExtension);
  }

  async updateStatus(
    tenantId: string,
    id: string,
    status: AgentStatus,
  ): Promise<AgentExtension> {
    const agentExtension = await this.findOne(tenantId, id);
    agentExtension.status = status;
    return await this.agentExtensionRepository.save(agentExtension);
  }

  async setCurrentCall(
    tenantId: string,
    id: string,
    callId: string | null,
  ): Promise<AgentExtension> {
    const agentExtension = await this.findOne(tenantId, id);
    agentExtension.currentCallId = callId;
    return await this.agentExtensionRepository.save(agentExtension);
  }

  async delete(tenantId: string, id: string): Promise<void> {
    const agentExtension = await this.findOne(tenantId, id);
    await this.agentExtensionRepository.remove(agentExtension);
  }

  async getAvailableAgents(tenantId: string): Promise<AgentExtension[]> {
    return await this.agentExtensionRepository.find({
      where: {
        tenantId,
        status: AgentStatus.AVAILABLE,
        isActive: true,
      },
      relations: ['user'],
      order: { extension: 'ASC' },
    });
  }
}

