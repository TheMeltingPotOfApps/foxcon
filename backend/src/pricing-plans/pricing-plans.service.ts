import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PricingPlan } from '../entities/pricing-plan.entity';

@Injectable()
export class PricingPlansService {
  constructor(
    @InjectRepository(PricingPlan)
    private pricingPlanRepository: Repository<PricingPlan>,
  ) {}

  async findAll(): Promise<PricingPlan[]> {
    return this.pricingPlanRepository.find({
      order: { sortOrder: 'ASC' },
    });
  }

  async findActive(): Promise<PricingPlan[]> {
    return this.pricingPlanRepository.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC' },
    });
  }

  async findOne(id: string): Promise<PricingPlan> {
    const plan = await this.pricingPlanRepository.findOne({ where: { id } });
    if (!plan) {
      throw new NotFoundException('Pricing plan not found');
    }
    return plan;
  }

  async findByName(name: string): Promise<PricingPlan | null> {
    return this.pricingPlanRepository.findOne({ where: { name } });
  }

  async findDefault(): Promise<PricingPlan | null> {
    return this.pricingPlanRepository.findOne({
      where: { isDefault: true, isActive: true },
    });
  }

  async create(data: Partial<PricingPlan>): Promise<PricingPlan> {
    const plan = this.pricingPlanRepository.create(data);
    return this.pricingPlanRepository.save(plan);
  }

  async update(id: string, updates: Partial<PricingPlan>): Promise<PricingPlan> {
    const plan = await this.findOne(id);
    Object.assign(plan, updates);
    return this.pricingPlanRepository.save(plan);
  }

  async delete(id: string): Promise<void> {
    const plan = await this.findOne(id);
    await this.pricingPlanRepository.remove(plan);
  }

  async setDefault(id: string): Promise<PricingPlan> {
    // Unset all other defaults
    await this.pricingPlanRepository.update({ isDefault: true }, { isDefault: false });
    
    // Set this as default
    const plan = await this.findOne(id);
    plan.isDefault = true;
    return this.pricingPlanRepository.save(plan);
  }
}

