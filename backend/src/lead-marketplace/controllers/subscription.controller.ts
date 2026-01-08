import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { SubscriptionService } from '../services/subscription.service';
import { CreateSubscriptionDto } from '../dto/create-subscription.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SubscriptionStatus } from '../entities/subscription.entity';

@Controller('nurture-leads/subscriptions')
@UseGuards(JwtAuthGuard, TenantGuard)
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Post()
  async create(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateSubscriptionDto,
  ) {
    return this.subscriptionService.create(
      tenantId,
      user.userId || user.sub,
      dto.listingId,
      dto.leadCount,
      dto.startDate,
      dto.endDate,
      dto.priority,
      dto.distributionSchedule,
    );
  }

  @Get()
  async findAll(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Query('listingId') listingId?: string,
    @Query('status') status?: SubscriptionStatus,
  ) {
    return this.subscriptionService.findAll(tenantId, user.userId || user.sub, listingId, status);
  }

  @Get(':id')
  async findOne(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.subscriptionService.findOne(tenantId, id);
  }

  @Post(':id/pause')
  async pause(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.subscriptionService.pause(tenantId, id, user.userId || user.sub);
  }

  @Post(':id/resume')
  async resume(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.subscriptionService.resume(tenantId, id, user.userId || user.sub);
  }

  @Post(':id/cancel')
  async cancel(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.subscriptionService.cancel(tenantId, id, user.userId || user.sub);
  }
}

