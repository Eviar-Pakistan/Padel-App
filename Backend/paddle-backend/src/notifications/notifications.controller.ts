import {
  Controller,
  Get,
  Param,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserGuard } from '../auth/user.guard';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard, UserGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findMine(@Req() req: { user: { userId: number } }) {
    return this.notificationsService.findMine(req.user.userId);
  }

  @Get('unread-count')
  unreadCount(@Req() req: { user: { userId: number } }) {
    return this.notificationsService.unreadCount(req.user.userId);
  }

  @Patch('read-all')
  markAllRead(@Req() req: { user: { userId: number } }) {
    return this.notificationsService.markAllRead(req.user.userId);
  }

  @Patch(':id/read')
  markRead(
    @Param('id') id: string,
    @Req() req: { user: { userId: number } },
  ) {
    return this.notificationsService.markRead(req.user.userId, id);
  }
}
