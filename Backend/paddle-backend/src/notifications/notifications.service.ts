import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Latest notifications for the signed-in user (newest first). */
  findMine(receiverId: number) {
    return this.prisma.notification.findMany({
      where: { receiverId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async unreadCount(receiverId: number) {
    const where: Prisma.NotificationWhereInput = {
      receiverId,
      isRead: false,
    };
    const count = await this.prisma.notification.count({ where });
    return { count };
  }

  async markRead(receiverId: number, id: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, receiverId },
    });
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }
    const data: Prisma.NotificationUpdateInput = { isRead: true };
    return this.prisma.notification.update({
      where: { id },
      data,
    });
  }

  async markAllRead(receiverId: number) {
    const where: Prisma.NotificationWhereInput = {
      receiverId,
      isRead: false,
    };
    const data: Prisma.NotificationUpdateManyMutationInput = { isRead: true };
    await this.prisma.notification.updateMany({ where, data });
    return { message: 'All notifications marked as read' };
  }
}
