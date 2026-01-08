import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantLimits } from '../entities/tenant-limits.entity';
import { PricingPlan } from '../entities/pricing-plan.entity';

@Injectable()
export class TenantLimitsService {
  constructor(
    @InjectRepository(TenantLimits)
    private tenantLimitsRepository: Repository<TenantLimits>,
    @InjectRepository(PricingPlan)
    private pricingPlanRepository: Repository<PricingPlan>,
  ) {}

  async initializeDemoLimits(tenantId: string): Promise<TenantLimits> {
    // Get default demo plan
    const demoPlan = await this.pricingPlanRepository.findOne({
      where: { name: 'demo', isActive: true },
    });

    if (!demoPlan) {
      throw new NotFoundException('Demo plan not found');
    }

    // Create tenant limits from demo plan
    const limits = this.tenantLimitsRepository.create({
      tenantId,
      smsLimit: demoPlan.smsLimit,
      smsUsed: 0,
      callLimit: demoPlan.callLimit,
      callUsed: 0,
      aiMessageLimit: demoPlan.aiMessageLimit,
      aiMessageUsed: 0,
      aiVoiceLimit: demoPlan.aiVoiceLimit,
      aiVoiceUsed: 0,
      aiTemplateLimit: demoPlan.aiTemplateLimit,
      aiTemplateUsed: 0,
      contentAiLimit: demoPlan.contentAiLimit,
      contentAiUsed: 0,
      planType: 'demo',
      isActive: true,
      restrictions: demoPlan.restrictions || {},
    });

    return this.tenantLimitsRepository.save(limits);
  }

  async getLimits(tenantId: string): Promise<TenantLimits | null> {
    return this.tenantLimitsRepository.findOne({
      where: { tenantId },
    });
  }

  async getOrCreateLimits(tenantId: string): Promise<TenantLimits> {
    let limits = await this.getLimits(tenantId);
    if (!limits) {
      limits = await this.initializeDemoLimits(tenantId);
    }
    return limits;
  }

  async incrementSMSUsage(tenantId: string, count: number = 1): Promise<void> {
    const limits = await this.getOrCreateLimits(tenantId);
    limits.smsUsed = (limits.smsUsed || 0) + count;
    await this.tenantLimitsRepository.save(limits);
  }

  async incrementCallUsage(tenantId: string, count: number = 1): Promise<void> {
    const limits = await this.getOrCreateLimits(tenantId);
    limits.callUsed = (limits.callUsed || 0) + count;
    await this.tenantLimitsRepository.save(limits);
  }

  async incrementAIUsage(tenantId: string, type: 'message' | 'voice' | 'template' | 'content', count: number = 1): Promise<void> {
    const limits = await this.getOrCreateLimits(tenantId);
    switch (type) {
      case 'message':
        limits.aiMessageUsed = (limits.aiMessageUsed || 0) + count;
        break;
      case 'voice':
        limits.aiVoiceUsed = (limits.aiVoiceUsed || 0) + count;
        break;
      case 'template':
        limits.aiTemplateUsed = (limits.aiTemplateUsed || 0) + count;
        break;
      case 'content':
        limits.contentAiUsed = (limits.contentAiUsed || 0) + count;
        break;
    }
    await this.tenantLimitsRepository.save(limits);
  }

  async checkLimit(tenantId: string, type: 'sms' | 'call' | 'ai_message' | 'ai_voice' | 'ai_template' | 'content_ai'): Promise<boolean> {
    const limits = await this.getOrCreateLimits(tenantId);
    
    if (!limits.isActive) {
      return false;
    }

    switch (type) {
      case 'sms':
        return limits.smsLimit === 0 || (limits.smsUsed || 0) < limits.smsLimit;
      case 'call':
        return limits.callLimit === 0 || (limits.callUsed || 0) < limits.callLimit;
      case 'ai_message':
        return limits.aiMessageLimit === 0 || (limits.aiMessageUsed || 0) < limits.aiMessageLimit;
      case 'ai_voice':
        return limits.aiVoiceLimit === 0 || (limits.aiVoiceUsed || 0) < limits.aiVoiceLimit;
      case 'ai_template':
        return limits.aiTemplateLimit === 0 || (limits.aiTemplateUsed || 0) < limits.aiTemplateLimit;
      case 'content_ai':
        return limits.contentAiLimit === 0 || (limits.contentAiUsed || 0) < limits.contentAiLimit;
      default:
        return false;
    }
  }

  async updateLimits(tenantId: string, updates: Partial<TenantLimits>): Promise<TenantLimits> {
    const limits = await this.getOrCreateLimits(tenantId);
    Object.assign(limits, updates);
    return this.tenantLimitsRepository.save(limits);
  }

  async updatePlan(tenantId: string, planName: string): Promise<TenantLimits> {
    const plan = await this.pricingPlanRepository.findOne({
      where: { name: planName, isActive: true },
    });

    if (!plan) {
      throw new NotFoundException(`Plan ${planName} not found`);
    }

    const limits = await this.getOrCreateLimits(tenantId);
    
    // Update limits from plan
    limits.smsLimit = plan.smsLimit;
    limits.callLimit = plan.callLimit;
    limits.aiMessageLimit = plan.aiMessageLimit;
    limits.aiVoiceLimit = plan.aiVoiceLimit;
    limits.aiTemplateLimit = plan.aiTemplateLimit;
    limits.contentAiLimit = plan.contentAiLimit;
    limits.planType = planName;
    limits.restrictions = plan.restrictions || {};

    // Reset trial end date if plan has trial days
    if (plan.trialDays && plan.trialDays > 0) {
      limits.trialEndsAt = new Date(Date.now() + plan.trialDays * 24 * 60 * 60 * 1000);
    }

    return this.tenantLimitsRepository.save(limits);
  }
}

