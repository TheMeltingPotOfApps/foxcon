import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiTemplate } from '../entities/ai-template.entity';
import { CreateAiTemplateDto } from './dto/create-ai-template.dto';

@Injectable()
export class AiTemplatesService {
  constructor(
    @InjectRepository(AiTemplate)
    private readonly aiTemplateRepository: Repository<AiTemplate>,
  ) {}

  async create(tenantId: string, dto: CreateAiTemplateDto): Promise<AiTemplate> {
    const template = this.aiTemplateRepository.create({
      ...dto,
      tenantId,
    });
    return this.aiTemplateRepository.save(template);
  }

  async findAll(tenantId: string): Promise<AiTemplate[]> {
    return this.aiTemplateRepository.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(tenantId: string, id: string): Promise<AiTemplate> {
    const template = await this.aiTemplateRepository.findOne({
      where: { id, tenantId },
    });
    if (!template) {
      throw new NotFoundException('AI template not found');
    }
    return template;
  }

  async update(
    tenantId: string,
    id: string,
    dto: Partial<CreateAiTemplateDto>,
  ): Promise<AiTemplate> {
    const template = await this.findOne(tenantId, id);
    Object.assign(template, dto);
    return this.aiTemplateRepository.save(template);
  }

  async delete(tenantId: string, id: string): Promise<void> {
    const template = await this.findOne(tenantId, id);
    await this.aiTemplateRepository.remove(template);
  }
}

