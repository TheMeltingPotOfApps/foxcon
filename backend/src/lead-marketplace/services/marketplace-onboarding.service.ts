import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  MarketplaceOnboardingProgress,
  MarketplaceOnboardingStep,
} from '../entities/marketplace-onboarding-progress.entity';
import { MarketplaceUser, MarketplaceUserType } from '../entities/marketplace-user.entity';
import { Listing } from '../entities/listing.entity';
import { MarketplaceSubscription } from '../entities/subscription.entity';
import { LeadReservation } from '../entities/lead-reservation.entity';
import { MarketingPlatformIntegration } from '../entities/marketing-platform-integration.entity';

@Injectable()
export class MarketplaceOnboardingService {
  private readonly logger = new Logger(MarketplaceOnboardingService.name);

  constructor(
    @InjectRepository(MarketplaceOnboardingProgress)
    private onboardingRepository: Repository<MarketplaceOnboardingProgress>,
    @InjectRepository(MarketplaceUser)
    private marketplaceUserRepository: Repository<MarketplaceUser>,
    @InjectRepository(Listing)
    private listingRepository: Repository<Listing>,
    @InjectRepository(MarketplaceSubscription)
    private subscriptionRepository: Repository<MarketplaceSubscription>,
    @InjectRepository(LeadReservation)
    private leadReservationRepository: Repository<LeadReservation>,
    @InjectRepository(MarketingPlatformIntegration)
    private integrationRepository: Repository<MarketingPlatformIntegration>,
  ) {}

  async getOrCreateProgress(tenantId: string, userId: string): Promise<MarketplaceOnboardingProgress> {
    try {
      let progress = await this.onboardingRepository.findOne({
        where: { userId },
      });

      if (!progress) {
        progress = this.onboardingRepository.create({
          userId,
          currentStep: MarketplaceOnboardingStep.WELCOME,
          completedSteps: [],
          stepData: {},
          isCompleted: false,
          skipped: false,
        });
        progress = await this.onboardingRepository.save(progress);
        this.logger.log(`Created marketplace onboarding progress for user ${userId}`);
      }

      return progress;
    } catch (error: any) {
      this.logger.error(`Failed to get or create marketplace onboarding progress: ${error.message}`, error.stack);
      throw error;
    }
  }

  async updateStep(
    tenantId: string,
    userId: string,
    step: MarketplaceOnboardingStep,
    data?: any,
  ): Promise<MarketplaceOnboardingProgress> {
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

    // Handle role selection
    if (step === MarketplaceOnboardingStep.CHOOSE_ROLE && data?.userType) {
      progress.selectedUserType = data.userType;
    }

    // Determine next step based on user type
    const nextStep = this.getNextStep(step, progress.selectedUserType, completedSteps);

    // Check if all steps are completed
    const isCompleted = nextStep === MarketplaceOnboardingStep.COMPLETE;

    progress.currentStep = nextStep;
    progress.completedSteps = completedSteps;
    progress.stepData = stepData;
    progress.isCompleted = isCompleted;
    if (isCompleted && !progress.completedAt) {
      progress.completedAt = new Date();
    }

    return this.onboardingRepository.save(progress);
  }

  async skipOnboarding(tenantId: string, userId: string): Promise<MarketplaceOnboardingProgress> {
    const progress = await this.getOrCreateProgress(tenantId, userId);
    progress.skipped = true;
    progress.isCompleted = true;
    progress.completedAt = new Date();
    return this.onboardingRepository.save(progress);
  }

  async getProgress(tenantId: string, userId: string): Promise<MarketplaceOnboardingProgress | null> {
    try {
      const progress = await this.onboardingRepository.findOne({
        where: { userId },
      });

      if (progress && !progress.skipped && !progress.isCompleted) {
        // Auto-validate steps based on actual data
        await this.autoValidateSteps(tenantId, userId, progress);
        // Reload progress after auto-validation
        return await this.onboardingRepository.findOne({
          where: { userId },
        });
      }

      return progress;
    } catch (error: any) {
      this.logger.error(`Failed to get marketplace onboarding progress: ${error.message}`, error.stack);
      throw error;
    }
  }

  private getNextStep(
    currentStep: MarketplaceOnboardingStep,
    userType: MarketplaceUserType | null,
    completedSteps: MarketplaceOnboardingStep[],
  ): MarketplaceOnboardingStep {
    const allSteps = Object.values(MarketplaceOnboardingStep);
    const currentIndex = allSteps.indexOf(currentStep);

    // If role not selected yet, next step is choose role
    if (!userType && currentStep === MarketplaceOnboardingStep.WELCOME) {
      return MarketplaceOnboardingStep.CHOOSE_ROLE;
    }

    // After choosing role, route based on user type
    if (currentStep === MarketplaceOnboardingStep.CHOOSE_ROLE) {
      if (userType === MarketplaceUserType.MARKETER || userType === MarketplaceUserType.BOTH) {
        return MarketplaceOnboardingStep.MARKETER_PROFILE;
      } else {
        return MarketplaceOnboardingStep.BUYER_PROFILE;
      }
    }

    // Marketer flow
    if (
      userType === MarketplaceUserType.MARKETER ||
      (userType === MarketplaceUserType.BOTH && currentStep.startsWith('marketer_'))
    ) {
      if (currentStep === MarketplaceOnboardingStep.MARKETER_PROFILE) {
        return MarketplaceOnboardingStep.MARKETER_INTEGRATION;
      }
      if (currentStep === MarketplaceOnboardingStep.MARKETER_INTEGRATION) {
        return MarketplaceOnboardingStep.MARKETER_FIRST_LISTING;
      }
      if (currentStep === MarketplaceOnboardingStep.MARKETER_FIRST_LISTING) {
        if (userType === MarketplaceUserType.BOTH) {
          return MarketplaceOnboardingStep.BUYER_PROFILE;
        }
        return MarketplaceOnboardingStep.COMPLETE;
      }
    }

    // Buyer flow
    if (
      userType === MarketplaceUserType.BUYER ||
      (userType === MarketplaceUserType.BOTH && currentStep.startsWith('buyer_'))
    ) {
      if (currentStep === MarketplaceOnboardingStep.BUYER_PROFILE) {
        return MarketplaceOnboardingStep.BUYER_PURCHASE_RESERVATIONS;
      }
      if (currentStep === MarketplaceOnboardingStep.BUYER_PURCHASE_RESERVATIONS) {
        return MarketplaceOnboardingStep.BUYER_FIRST_SUBSCRIPTION;
      }
      if (currentStep === MarketplaceOnboardingStep.BUYER_FIRST_SUBSCRIPTION) {
        return MarketplaceOnboardingStep.COMPLETE;
      }
    }

    // Default: move to next step
    const nextIndex = currentIndex + 1;
    return nextIndex < allSteps.length ? allSteps[nextIndex] : MarketplaceOnboardingStep.COMPLETE;
  }

  private async autoValidateSteps(
    tenantId: string,
    userId: string,
    progress: MarketplaceOnboardingProgress,
  ): Promise<void> {
    const completedSteps = progress.completedSteps || [];
    const stepData = progress.stepData || {};
    const stepsToComplete: MarketplaceOnboardingStep[] = [];

    // Check if marketplace user exists
    const marketplaceUser = await this.marketplaceUserRepository.findOne({
      where: { userId, tenantId },
    });

    if (marketplaceUser) {
      // Check marketer steps
      if (
        (marketplaceUser.userType === MarketplaceUserType.MARKETER ||
          marketplaceUser.userType === MarketplaceUserType.BOTH) &&
        !completedSteps.includes(MarketplaceOnboardingStep.MARKETER_PROFILE)
      ) {
        if (marketplaceUser.companyName && marketplaceUser.storefrontSlug) {
          stepsToComplete.push(MarketplaceOnboardingStep.MARKETER_PROFILE);
        }
      }

      if (
        (marketplaceUser.userType === MarketplaceUserType.MARKETER ||
          marketplaceUser.userType === MarketplaceUserType.BOTH) &&
        !completedSteps.includes(MarketplaceOnboardingStep.MARKETER_INTEGRATION)
      ) {
        const integrationCount = await this.integrationRepository.count({
          where: { tenantId, marketerId: userId, isActive: true },
        });
        if (integrationCount > 0) {
          stepsToComplete.push(MarketplaceOnboardingStep.MARKETER_INTEGRATION);
        }
      }

      if (
        (marketplaceUser.userType === MarketplaceUserType.MARKETER ||
          marketplaceUser.userType === MarketplaceUserType.BOTH) &&
        !completedSteps.includes(MarketplaceOnboardingStep.MARKETER_FIRST_LISTING)
      ) {
        const listingCount = await this.listingRepository.count({
          where: { tenantId, marketerId: userId },
        });
        if (listingCount > 0) {
          stepsToComplete.push(MarketplaceOnboardingStep.MARKETER_FIRST_LISTING);
        }
      }

      // Check buyer steps
      if (
        (marketplaceUser.userType === MarketplaceUserType.BUYER ||
          marketplaceUser.userType === MarketplaceUserType.BOTH) &&
        !completedSteps.includes(MarketplaceOnboardingStep.BUYER_PURCHASE_RESERVATIONS)
      ) {
        const reservation = await this.leadReservationRepository.findOne({
          where: { tenantId, userId },
        });
        if (reservation && Number(reservation.balance) > 0) {
          stepsToComplete.push(MarketplaceOnboardingStep.BUYER_PURCHASE_RESERVATIONS);
        }
      }

      if (
        (marketplaceUser.userType === MarketplaceUserType.BUYER ||
          marketplaceUser.userType === MarketplaceUserType.BOTH) &&
        !completedSteps.includes(MarketplaceOnboardingStep.BUYER_FIRST_SUBSCRIPTION)
      ) {
        const subscriptionCount = await this.subscriptionRepository.count({
          where: { tenantId, buyerId: userId },
        });
        if (subscriptionCount > 0) {
          stepsToComplete.push(MarketplaceOnboardingStep.BUYER_FIRST_SUBSCRIPTION);
        }
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

      // Determine current step
      const allSteps = Object.values(MarketplaceOnboardingStep);
      let currentStep = progress.currentStep;
      for (const step of allSteps) {
        if (!completedSteps.includes(step) && step !== MarketplaceOnboardingStep.COMPLETE) {
          currentStep = step;
          break;
        }
      }

      // Check if all steps are completed
      const isCompleted = completedSteps.length >= allSteps.length - 1; // -1 for COMPLETE step

      progress.currentStep = isCompleted ? MarketplaceOnboardingStep.COMPLETE : currentStep;
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


