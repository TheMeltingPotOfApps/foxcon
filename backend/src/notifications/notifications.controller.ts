import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationStatus, NotificationType } from '../entities/notification.entity';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { UserId } from '../common/decorators/user-id.decorator';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  async getNotifications(
    @TenantId() tenantId: string,
    @UserId() userId: string,
    @Query('status') status?: NotificationStatus,
    @Query('type') type?: NotificationType,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    try {
      if (!tenantId || !userId) {
        return { notifications: [], total: 0 };
      }
      return this.notificationsService.getNotifications(tenantId, userId, {
        status,
        type,
        limit: limit ? parseInt(limit.toString()) : undefined,
        offset: offset ? parseInt(offset.toString()) : undefined,
      });
    } catch (error) {
      console.error('Error getting notifications:', error);
      return { notifications: [], total: 0 };
    }
  }

  @Get('unread-count')
  async getUnreadCount(@TenantId() tenantId: string, @UserId() userId: string) {
    try {
      if (!tenantId || !userId) {
        return { count: 0 };
      }
      const count = await this.notificationsService.getUnreadCount(tenantId, userId);
      return { count };
    } catch (error) {
      console.error('Error getting unread count:', error);
      // Return 0 if there's an error (e.g., table doesn't exist yet)
      return { count: 0 };
    }
  }

  @Put(':id/read')
  async markAsRead(
    @TenantId() tenantId: string,
    @UserId() userId: string,
    @Param('id') notificationId: string,
  ) {
    return this.notificationsService.markAsRead(tenantId, userId, notificationId);
  }

  @Put('read-all')
  async markAllAsRead(@TenantId() tenantId: string, @UserId() userId: string) {
    await this.notificationsService.markAllAsRead(tenantId, userId);
    return { success: true };
  }

  @Delete('read-all')
  async deleteAllRead(@TenantId() tenantId: string, @UserId() userId: string) {
    await this.notificationsService.deleteAllRead(tenantId, userId);
    return { success: true };
  }

  @Put(':id/archive')
  async archive(
    @TenantId() tenantId: string,
    @UserId() userId: string,
    @Param('id') notificationId: string,
  ) {
    return this.notificationsService.archive(tenantId, userId, notificationId);
  }

  @Delete(':id')
  async delete(
    @TenantId() tenantId: string,
    @UserId() userId: string,
    @Param('id') notificationId: string,
  ) {
    await this.notificationsService.delete(tenantId, userId, notificationId);
    return { success: true };
  }

  @Get('preferences')
  async getPreferences(
    @TenantId() tenantId: string,
    @UserId() userId: string,
    @Query('campaignId') campaignId?: string,
    @Query('journeyId') journeyId?: string,
    @Query('conversationId') conversationId?: string,
  ) {
    return this.notificationsService.getPreferences(tenantId, userId, {
      campaignId,
      journeyId,
      conversationId,
    });
  }

  @Put('preferences')
  async updatePreferences(
    @TenantId() tenantId: string,
    @UserId() userId: string,
    @Body() data: any,
    @Query('campaignId') campaignId?: string,
    @Query('journeyId') journeyId?: string,
    @Query('conversationId') conversationId?: string,
  ) {
    return this.notificationsService.updatePreferences(tenantId, userId, data, {
      campaignId,
      journeyId,
      conversationId,
    });
  }
}

