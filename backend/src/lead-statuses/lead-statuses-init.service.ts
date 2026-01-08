import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from '../entities/tenant.entity';
import { LeadStatusesService } from './lead-statuses.service';

@Injectable()
export class LeadStatusesInitService implements OnModuleInit {
  private readonly logger = new Logger(LeadStatusesInitService.name);

  constructor(
    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,
    private leadStatusesService: LeadStatusesService,
  ) {}

  async onModuleInit() {
    // Initialize default statuses for all existing tenants on application startup
    this.logger.log('[LeadStatusesInit] Initializing default statuses for all tenants...');

    try {
      const tenants = await this.tenantRepository.find({
        where: { isActive: true },
        select: ['id'],
      });

      this.logger.log(`[LeadStatusesInit] Found ${tenants.length} active tenant(s)`);

      let initializedCount = 0;
      let skippedCount = 0;

      for (const tenant of tenants) {
        try {
          // Check if statuses already exist by calling findAllStatuses which will initialize if needed
          const statuses = await this.leadStatusesService.findAllStatuses(tenant.id, true);
          const existingCount = statuses.length;

          if (existingCount === 0) {
            await this.leadStatusesService.initializeDefaultStatuses(tenant.id);
            initializedCount++;
            this.logger.log(`[LeadStatusesInit] Initialized default statuses for tenant ${tenant.id}`);
          } else {
            skippedCount++;
          }
        } catch (error) {
          this.logger.error(
            `[LeadStatusesInit] Failed to initialize statuses for tenant ${tenant.id}: ${error.message}`,
            error.stack,
          );
        }
      }

      this.logger.log(
        `[LeadStatusesInit] Completed: ${initializedCount} tenant(s) initialized, ${skippedCount} tenant(s) already had statuses`,
      );
    } catch (error) {
      this.logger.error(`[LeadStatusesInit] Failed to initialize statuses: ${error.message}`, error.stack);
    }
  }
}

