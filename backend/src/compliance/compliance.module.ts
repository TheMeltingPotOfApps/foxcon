import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ComplianceController } from './compliance.controller';
import { ComplianceService } from './compliance.service';
import { Template } from '../entities/template.entity';
import { Tenant } from '../entities/tenant.entity';
import { Message } from '../entities/message.entity';
import { UserTenant } from '../entities/user-tenant.entity';
import { SuperAdminModule } from '../super-admin/super-admin.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Template, Tenant, Message, UserTenant]),
    forwardRef(() => SuperAdminModule),
  ],
  controllers: [ComplianceController],
  providers: [ComplianceService],
  exports: [ComplianceService],
})
export class ComplianceModule {}

