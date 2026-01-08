import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { ContentAiTemplate } from '../entities/content-ai-template.entity';
import { AiGenerationService } from '../ai/ai-generation.service';

@Injectable()
export class ContentAiService {
  constructor(
    @InjectRepository(ContentAiTemplate)
    private contentAiTemplateRepository: Repository<ContentAiTemplate>,
    private aiGenerationService: AiGenerationService,
  ) {}

  async create(tenantId: string, data: {
    name: string;
    description?: string;
    exampleMessages: string[];
    creativity?: number;
    unique?: boolean;
    config?: any;
  }): Promise<ContentAiTemplate> {
    if (!data.exampleMessages || data.exampleMessages.length < 3 || data.exampleMessages.length > 10) {
      throw new BadRequestException('Please provide 3-10 example messages');
    }

    const template = this.contentAiTemplateRepository.create({
      ...data,
      tenantId: tenantId as any,
      creativity: data.creativity ?? 0.7,
      unique: data.unique ?? false,
      config: data.config || {
        maxUniqueGenerationsPerHour: 100,
        maxUniqueGenerationsPerDay: 1000,
        maxLength: 160,
        preserveVariables: true,
      },
    });

    return await this.contentAiTemplateRepository.save(template);
  }

  async findAll(tenantId: string): Promise<ContentAiTemplate[]> {
    return await this.contentAiTemplateRepository.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(tenantId: string, id: string): Promise<ContentAiTemplate> {
    const template = await this.contentAiTemplateRepository.findOne({
      where: { id, tenantId },
    });

    if (!template) {
      throw new NotFoundException('Content AI template not found');
    }

    return template;
  }

  async update(tenantId: string, id: string, data: Partial<ContentAiTemplate>): Promise<ContentAiTemplate> {
    const template = await this.findOne(tenantId, id);

    if (data.exampleMessages && (data.exampleMessages.length < 3 || data.exampleMessages.length > 10)) {
      throw new BadRequestException('Please provide 3-10 example messages');
    }

    Object.assign(template, data);
    return await this.contentAiTemplateRepository.save(template);
  }

  async delete(tenantId: string, id: string): Promise<void> {
    const template = await this.findOne(tenantId, id);
    await this.contentAiTemplateRepository.remove(template);
  }

  async generateVariations(tenantId: string, id: string): Promise<string[]> {
    const template = await this.findOne(tenantId, id);

    if (!template.exampleMessages || !Array.isArray(template.exampleMessages) || template.exampleMessages.length === 0) {
      throw new BadRequestException('Template must have example messages to generate variations');
    }

    const variations = await this.aiGenerationService.generateContentAiVariations(
      template.exampleMessages,
      template.creativity ?? 0.7,
    );

    // Save generated variations
    template.generatedVariations = variations;
    await this.contentAiTemplateRepository.save(template);

    return variations;
  }

  async generateUniqueMessage(
    tenantId: string,
    id: string,
    context?: { contact?: any; journey?: any; previousMessages?: string[] },
  ): Promise<string> {
    const template = await this.findOne(tenantId, id);

    if (!template.unique) {
      throw new BadRequestException('Template is not configured for unique message generation');
    }

    // Check rate limits
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Count generations in the last hour (simplified - in production, use a separate tracking table)
    const maxPerHour = template.config?.maxUniqueGenerationsPerHour || 100;
    const maxPerDay = template.config?.maxUniqueGenerationsPerDay || 1000;

    // For now, we'll use lastUsedAt as a simple rate limiter
    // In production, implement proper rate limiting with a separate table
    if (template.lastUsedAt) {
      const timeSinceLastUse = now.getTime() - template.lastUsedAt.getTime();
      // Simple check - if used very recently, throttle
      if (timeSinceLastUse < 1000) {
        throw new BadRequestException('Rate limit exceeded. Please wait a moment before generating another message.');
      }
    }

    // Generate unique message
    const message = await this.aiGenerationService.generateUniqueMessage(
      template.exampleMessages,
      template.creativity,
      context,
    );

    // Update last used timestamp
    template.lastUsedAt = now;
    await this.contentAiTemplateRepository.save(template);

    return message;
  }

  async getRandomVariation(tenantId: string, id: string): Promise<string> {
    const template = await this.findOne(tenantId, id);

    if (!template.generatedVariations || template.generatedVariations.length === 0) {
      // Generate variations if not already generated
      await this.generateVariations(tenantId, id);
      const updated = await this.findOne(tenantId, id);
      const variations = updated.generatedVariations || [];
      return variations[Math.floor(Math.random() * variations.length)] || template.exampleMessages[0];
    }

    const variations = template.generatedVariations;
    return variations[Math.floor(Math.random() * variations.length)];
  }
}

