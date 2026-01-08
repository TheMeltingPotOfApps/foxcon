import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeadStatusesService } from './lead-statuses.service';
import { LeadStatusesController } from './lead-statuses.controller';
import { StatusAutomationSchedulerService } from './status-automation-scheduler.service';
import { LeadStatusesInitService } from './lead-statuses-init.service';
import { TenantLeadStatus } from './entities/tenant-lead-status.entity';
import { StatusAutomation } from './entities/status-automation.entity';
import { Contact } from '../entities/contact.entity';
import { Tenant } from '../entities/tenant.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([TenantLeadStatus, StatusAutomation, Contact, Tenant]),
  ],
  controllers: [LeadStatusesController],
  providers: [LeadStatusesService, StatusAutomationSchedulerService, LeadStatusesInitService],
  exports: [LeadStatusesService],
})
export class LeadStatusesModule {}

