import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';
import { Tenant } from '../entities/tenant.entity';
import { UserTenant } from '../entities/user-tenant.entity';
import { User } from '../entities/user.entity';
import { TwilioModule } from '../twilio/twilio.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tenant, UserTenant, User]),
    ConfigModule,
    TwilioModule,
  ],
  controllers: [TenantsController],
  providers: [TenantsService],
  exports: [TenantsService],
})
export class TenantsModule {}

