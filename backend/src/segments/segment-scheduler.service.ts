import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SegmentsService } from './segments.service';

@Injectable()
export class SegmentSchedulerService {
  private readonly logger = new Logger(SegmentSchedulerService.name);

  constructor(private segmentsService: SegmentsService) {}

  /**
   * Process segments with continuous inclusion
   * Runs every 5 minutes to check for new contacts matching segment criteria
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async processContinuousInclusionSegments() {
    try {
      this.logger.log('Processing continuous inclusion segments...');
      await this.segmentsService.processContinuousInclusionSegments();
      this.logger.log('Finished processing continuous inclusion segments');
    } catch (error) {
      this.logger.error(
        `Error processing continuous inclusion segments: ${error.message}`,
        error.stack,
      );
    }
  }
}

