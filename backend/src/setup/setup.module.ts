import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SetupController } from './setup.controller';
import { User } from '../entities/user.entity';
import { UserTenant } from '../entities/user-tenant.entity';
import { Tenant } from '../entities/tenant.entity';
import { SuperAdminModule } from '../super-admin/super-admin.module';
import { LeadStatusesModule } from '../lead-statuses/lead-statuses.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserTenant, Tenant]),
    forwardRef(() => SuperAdminModule),
    forwardRef(() => LeadStatusesModule),
  ],
  controllers: [SetupController],
})
export class SetupModule {}

