import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { WebAnalytics } from '../entities/web-analytics.entity';
import { TenantActivity } from '../entities/tenant-activity.entity';

@Module({
  imports: [TypeOrmModule.forFeature([WebAnalytics, TenantActivity])],
  providers: [AnalyticsService],
  controllers: [AnalyticsController],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}

