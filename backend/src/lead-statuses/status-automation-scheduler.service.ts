import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LeadStatusesService } from './lead-statuses.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from '../entities/tenant.entity';

@Injectable()
export class StatusAutomationSchedulerService {
  private readonly logger = new Logger(StatusAutomationSchedulerService.name);
  private isProcessing = false;

  constructor(
    private readonly leadStatusesService: LeadStatusesService,
    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,
  ) {}

  /**
   * Process status automations for all tenants
   * Runs every hour to check and apply time-based automations
   */
  @Cron(CronExpression.EVERY_HOUR)
  async processAllAutomations() {
    if (this.isProcessing) {
      this.logger.warn('[StatusAutomation] Previous cron job still running, skipping this run');
      return;
    }

    this.isProcessing = true;
    const startTime = Date.now();

    try {
      // Get all active tenants
      const tenants = await this.tenantRepository.find({
        where: { isActive: true },
        select: ['id'],
      });

      this.logger.log(`[StatusAutomation] Processing automations for ${tenants.length} tenant(s)`);

      let totalProcessed = 0;

      for (const tenant of tenants) {
        try {
          // Ensure default statuses are initialized
          await this.leadStatusesService.initializeDefaultStatuses(tenant.id);

          // Process automations for this tenant
          const count = await this.leadStatusesService.processAutomations(tenant.id);
          totalProcessed += count;

          if (count > 0) {
            this.logger.log(
              `[StatusAutomation] Processed ${count} contact(s) for tenant ${tenant.id}`,
            );
          }
        } catch (error) {
          this.logger.error(
            `[StatusAutomation] Failed to process automations for tenant ${tenant.id}: ${error.message}`,
            error.stack,
          );
        }
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        `[StatusAutomation] Completed processing. Updated ${totalProcessed} contact(s) across ${tenants.length} tenant(s) in ${duration}ms`,
      );
    } catch (error) {
      this.logger.error(`[StatusAutomation] Failed to process automations: ${error.message}`, error.stack);
    } finally {
      this.isProcessing = false;
    }
  }
}

