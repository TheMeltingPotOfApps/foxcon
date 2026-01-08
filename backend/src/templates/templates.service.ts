import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Template, TemplateType } from '../entities/template.entity';
import { TemplateVersion } from '../entities/template-version.entity';

@Injectable()
export class TemplatesService {
  constructor(
    @InjectRepository(Template)
    private templateRepository: Repository<Template>,
    @InjectRepository(TemplateVersion)
    private templateVersionRepository: Repository<TemplateVersion>,
  ) {}

  async create(tenantId: string, data: any): Promise<any> {
    const { content, variables, ...templateData } = data;
    
    const template = this.templateRepository.create({
      ...templateData,
      tenantId: tenantId as any, // Template extends BaseEntity which has tenantId
    });
    const savedTemplate = await this.templateRepository.save(template);
    const templateId = Array.isArray(savedTemplate) ? savedTemplate[0].id : (savedTemplate as Template).id;

    // Create initial version if content is provided
    if (content) {
      const version = this.templateVersionRepository.create({
        templateId: templateId,
        content: content,
        variables: variables || [],
        status: 'approved',
      });
      await this.templateVersionRepository.save(version);
    }

    return this.findOne(tenantId, templateId);
  }

  async findAll(tenantId: string, type?: TemplateType): Promise<any[]> {
    const where: any = { tenantId };
    if (type) {
      where.type = type;
    }

    const templates = await this.templateRepository.find({
      where,
      relations: ['versions'],
      order: { createdAt: 'DESC' },
    });

    // Map to frontend format
    return templates.map((template) => {
      const latestVersion = template.versions
        ?.filter((v) => v.status === 'approved')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] ||
        template.versions?.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

      return {
        id: template.id,
        name: template.name,
        type: template.type,
        category: template.category,
        content: latestVersion?.content || '',
        variables: latestVersion?.variables || [],
        isActive: true,
        version: template.versions?.length || 0,
        createdAt: template.createdAt.toISOString(),
        updatedAt: template.updatedAt.toISOString(),
      };
    });
  }

  async findOne(tenantId: string, id: string): Promise<any> {
    const template = await this.templateRepository.findOne({
      where: { id, tenantId },
      relations: ['versions'],
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    const latestVersion = template.versions
      ?.filter((v) => v.status === 'approved')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] ||
      template.versions?.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

    return {
      id: template.id,
      name: template.name,
      type: template.type,
      category: template.category,
      content: latestVersion?.content || '',
      variables: latestVersion?.variables || [],
      isActive: true,
      version: template.versions?.length || 0,
      createdAt: template.createdAt.toISOString(),
      updatedAt: template.updatedAt.toISOString(),
    };
  }

  async update(tenantId: string, id: string, data: any): Promise<any> {
    const { content, variables, ...templateData } = data;
    
    const template = await this.templateRepository.findOne({
      where: { id, tenantId },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    // Update template fields
    if (templateData.name !== undefined) template.name = templateData.name;
    if (templateData.type !== undefined) template.type = templateData.type;
    if (templateData.category !== undefined) template.category = templateData.category;

    await this.templateRepository.save(template);

    // Create new version if content is provided
    if (content) {
      const version = this.templateVersionRepository.create({
        templateId: template.id,
        content: content,
        variables: variables || [],
        status: 'approved',
      });
      await this.templateVersionRepository.save(version);
    }

    return this.findOne(tenantId, id);
  }

  async delete(tenantId: string, id: string): Promise<void> {
    const template = await this.templateRepository.findOne({
      where: { id, tenantId },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    await this.templateRepository.remove(template);
  }
}

