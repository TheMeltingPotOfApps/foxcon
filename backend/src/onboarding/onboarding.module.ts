import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';
import { OnboardingProgress } from '../entities/onboarding-progress.entity';
import { TwilioConfig } from '../entities/twilio-config.entity';
import { Contact } from '../entities/contact.entity';
import { Template } from '../entities/template.entity';
import { Campaign } from '../entities/campaign.entity';
import { Journey } from '../entities/journey.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OnboardingProgress,
      TwilioConfig,
      Contact,
      Template,
      Campaign,
      Journey,
    ]),
  ],
  controllers: [OnboardingController],
  providers: [OnboardingService],
  exports: [OnboardingService],
})
export class OnboardingModule {}

