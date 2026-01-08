import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OnboardingProgress, OnboardingStep } from '../entities/onboarding-progress.entity';
import { TwilioConfig } from '../entities/twilio-config.entity';
import { Contact } from '../entities/contact.entity';
import { Template } from '../entities/template.entity';
import { Campaign } from '../entities/campaign.entity';
import { Journey } from '../entities/journey.entity';

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);
  constructor(
    @InjectRepository(OnboardingProgress)
    private onboardingRepository: Repository<OnboardingProgress>,
    @InjectRepository(TwilioConfig)
    private twilioConfigRepository: Repository<TwilioConfig>,
    @InjectRepository(Contact)
    private contactRepository: Repository<Contact>,
    @InjectRepository(Template)
    private templateRepository: Repository<Template>,
    @InjectRepository(Campaign)
    private campaignRepository: Repository<Campaign>,
    @InjectRepository(Journey)
    private journeyRepository: Repository<Journey>,
  ) {}

  async getOrCreateProgress(tenantId: string, userId: string): Promise<OnboardingProgress> {
    try {
    let progress = await this.onboardingRepository.findOne({
      where: { tenantId, userId },
    });

    if (!progress) {
      progress = this.onboardingRepository.create({
        tenantId,
        userId,
        currentStep: OnboardingStep.WELCOME,
        completedSteps: [],
        stepData: {},
        isCompleted: false,
        skipped: false,
      });
      progress = await this.onboardingRepository.save(progress);
        this.logger.log(`Created onboarding progress for tenant ${tenantId}, user ${userId}`);
    }

    return progress;
    } catch (error: any) {
      this.logger.error(`Failed to get or create onboarding progress: ${error.message}`, error.stack);
      throw error;
    }
  }

  async updateStep(
    tenantId: string,
    userId: string,
    step: OnboardingStep,
    data?: any,
  ): Promise<OnboardingProgress> {
    const progress = await this.getOrCreateProgress(tenantId, userId);

    // Update step data
    const stepData = progress.stepData || {};
    stepData[step] = {
      completed: true,
      completedAt: new Date(),
      data: data || {},
    };

    // Add to completed steps if not already there
    const completedSteps = progress.completedSteps || [];
    if (!completedSteps.includes(step)) {
      completedSteps.push(step);
    }

    // Determine next step
    const allSteps = Object.values(OnboardingStep);
    const currentIndex = allSteps.indexOf(step);
    const nextStep = currentIndex < allSteps.length - 1 ? allSteps[currentIndex + 1] : OnboardingStep.COMPLETE;

    // Check if all steps are completed
    const isCompleted = nextStep === OnboardingStep.COMPLETE;

    progress.currentStep = nextStep;
    progress.completedSteps = completedSteps;
    progress.stepData = stepData;
    progress.isCompleted = isCompleted;
    if (isCompleted && !progress.completedAt) {
      progress.completedAt = new Date();
    }

    return this.onboardingRepository.save(progress);
  }

  async skipOnboarding(tenantId: string, userId: string): Promise<OnboardingProgress> {
    const progress = await this.getOrCreateProgress(tenantId, userId);
    progress.skipped = true;
    progress.isCompleted = true;
    progress.completedAt = new Date();
    return this.onboardingRepository.save(progress);
  }

  async getProgress(tenantId: string, userId: string): Promise<OnboardingProgress | null> {
    try {
    const progress = await this.onboardingRepository.findOne({
      where: { tenantId, userId },
    });

    if (progress && !progress.skipped && !progress.isCompleted) {
      // Auto-validate steps based on actual data
      await this.autoValidateSteps(tenantId, progress);
        // Reload progress after auto-validation
        return await this.onboardingRepository.findOne({
          where: { tenantId, userId },
        });
    }

    return progress;
    } catch (error: any) {
      this.logger.error(`Failed to get onboarding progress: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async autoValidateSteps(tenantId: string, progress: OnboardingProgress): Promise<void> {
    const completedSteps = progress.completedSteps || [];
    const stepData = progress.stepData || {};
    const stepsToComplete: OnboardingStep[] = [];

    // Check Twilio connection
    if (!completedSteps.includes(OnboardingStep.CONNECT_TWILIO)) {
      const twilioConfig = await this.twilioConfigRepository.findOne({
        where: { tenantId },
      });
      if (twilioConfig && twilioConfig.accountSid && twilioConfig.authToken) {
        stepsToComplete.push(OnboardingStep.CONNECT_TWILIO);
      }
    }

    // Check contacts
    if (!completedSteps.includes(OnboardingStep.ADD_CONTACTS)) {
      const contactCount = await this.contactRepository.count({
        where: { tenantId },
      });
      if (contactCount > 0) {
        stepsToComplete.push(OnboardingStep.ADD_CONTACTS);
      }
    }

    // Check templates
    if (!completedSteps.includes(OnboardingStep.CREATE_TEMPLATE)) {
      const templateCount = await this.templateRepository.count({
        where: { tenantId },
      });
      if (templateCount > 0) {
        stepsToComplete.push(OnboardingStep.CREATE_TEMPLATE);
      }
    }

    // Check campaigns
    if (!completedSteps.includes(OnboardingStep.CREATE_CAMPAIGN)) {
      const campaignCount = await this.campaignRepository.count({
        where: { tenantId },
      });
      if (campaignCount > 0) {
        stepsToComplete.push(OnboardingStep.CREATE_CAMPAIGN);
      }
    }

    // Check journeys
    if (!completedSteps.includes(OnboardingStep.CREATE_JOURNEY)) {
      const journeyCount = await this.journeyRepository.count({
        where: { tenantId },
      });
      if (journeyCount > 0) {
        stepsToComplete.push(OnboardingStep.CREATE_JOURNEY);
      }
    }

    // Update progress for all completed steps
    if (stepsToComplete.length > 0) {
      for (const step of stepsToComplete) {
        stepData[step] = {
          completed: true,
          completedAt: new Date(),
          data: {},
        };
        if (!completedSteps.includes(step)) {
          completedSteps.push(step);
        }
      }

      // Determine current step (first incomplete step)
      const allSteps = Object.values(OnboardingStep);
      let currentStep = progress.currentStep;
      for (const step of allSteps) {
        if (!completedSteps.includes(step) && step !== OnboardingStep.COMPLETE) {
          currentStep = step;
          break;
        }
      }

      // Check if all steps are completed
      const isCompleted = completedSteps.length >= allSteps.length - 1; // -1 for COMPLETE step

      progress.currentStep = isCompleted ? OnboardingStep.COMPLETE : currentStep;
      progress.completedSteps = completedSteps;
      progress.stepData = stepData;
      progress.isCompleted = isCompleted;
      if (isCompleted && !progress.completedAt) {
        progress.completedAt = new Date();
      }

      await this.onboardingRepository.save(progress);
    }
  }
}

