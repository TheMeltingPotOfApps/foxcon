import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JourneyTemplate, TemplateCategory } from '../entities/journey-template.entity';
import { Tenant } from '../entities/tenant.entity';
import { create5DayLeadJourneyTemplate } from './seed-templates';

@Injectable()
export class SeedTemplatesService implements OnModuleInit {
  constructor(
    @InjectRepository(JourneyTemplate)
    private templateRepository: Repository<JourneyTemplate>,
    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,
  ) {}

  async onModuleInit() {
    // Seed the 5-day lead journey template if it doesn't exist
    await this.seed5DayLeadJourney();
  }

  async seed5DayLeadJourney() {
    try {
      const existing = await this.templateRepository.findOne({
        where: {
          name: '5-Day Lead Nurture Journey',
          isPublic: true,
        },
      });

      if (existing) {
        console.log('5-Day Lead Nurture Journey template already exists');
        return;
      }

      // Find the first tenant to use for seeding, or skip if no tenants exist
      const tenants = await this.tenantRepository.find({
        order: { createdAt: 'ASC' },
        take: 1,
      });

      if (!tenants || tenants.length === 0) {
        console.log('No tenants found, skipping template seeding');
        return;
      }

      const firstTenant = tenants[0];
      const templateData = create5DayLeadJourneyTemplate();
      const template = this.templateRepository.create({
        ...templateData,
        tenantId: firstTenant.id, // Use first tenant for seeding
      });

      await this.templateRepository.save(template);
      console.log('Created 5-Day Lead Nurture Journey template');
    } catch (error) {
      console.error('Error seeding 5-Day Lead Nurture Journey template:', error.message);
      // Don't throw - allow app to continue even if seeding fails
    }
  }
}

