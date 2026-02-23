import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { NotificationsService, ListNotificationsQuery } from './notifications.service';
import { NotificationChannel, NotificationType } from '@prisma/client';

interface AuthUser {
  id: string;
  email: string;
}

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async findAll(
    @CurrentUser() user: AuthUser,
    @Query('type') type?: NotificationType,
    @Query('channel') channel?: NotificationChannel,
    @Query('read') read?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const query: ListNotificationsQuery = {
      userId: user.id,
      type,
      channel,
      read: read !== undefined ? read === 'true' : undefined,
      limit: limit ? parseInt(limit, 10) : 20,
      offset: offset ? parseInt(offset, 10) : 0,
    };

    return this.notificationsService.findAll(query);
  }

  @Get('unread-count')
  async getUnreadCount(@CurrentUser() user: AuthUser) {
    const count = await this.notificationsService.getUnreadCount(user.id);
    return { count };
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.notificationsService.findOne(id, user.id);
  }

  @Patch(':id/read')
  async markAsRead(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    await this.notificationsService.markAsRead(id, user.id);
    return { success: true };
  }

  @Post('read-all')
  async markAllAsRead(@CurrentUser() user: AuthUser) {
    await this.notificationsService.markAllAsRead(user.id);
    return { success: true };
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    await this.notificationsService.delete(id, user.id);
    return { success: true };
  }
}
