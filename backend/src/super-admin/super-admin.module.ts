import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SuperAdminService } from './super-admin.service';
import { SuperAdminManagementService } from './super-admin-management.service';
import { SuperAdminController } from './super-admin.controller';
import { Tenant } from '../entities/tenant.entity';
import { User } from '../entities/user.entity';
import { UserTenant } from '../entities/user-tenant.entity';
import { WebAnalytics } from '../entities/web-analytics.entity';
import { TenantActivity } from '../entities/tenant-activity.entity';
import { Subscription } from '../entities/subscription.entity';
import { CalendarEvent } from '../entities/calendar-event.entity';
import { Template } from '../entities/template.entity';
import { Campaign } from '../entities/campaign.entity';
import { Journey } from '../entities/journey.entity';
import { Contact } from '../entities/contact.entity';
import { TenantLimitsModule } from '../tenant-limits/tenant-limits.module';
import { PricingPlansModule } from '../pricing-plans/pricing-plans.module';
import { SuperAdminGuard } from '../common/guards/super-admin.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Tenant,
      User,
      UserTenant,
      WebAnalytics,
      TenantActivity,
      Subscription,
      CalendarEvent,
      Template,
      Campaign,
      Journey,
      Contact,
    ]),
    forwardRef(() => TenantLimitsModule),
    forwardRef(() => PricingPlansModule),
  ],
  providers: [SuperAdminService, SuperAdminManagementService, SuperAdminGuard],
  controllers: [SuperAdminController],
  exports: [SuperAdminService, SuperAdminManagementService, SuperAdminGuard],
})
export class SuperAdminModule {}

