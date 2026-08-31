import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ChatJoinStatus,
  ChatMessageType,
} from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ImageUploadService } from '../common/image-upload.service';
import { ChatMediaService } from './chat-media.service';
import { CreateChatGroupDto } from './dto/create-chat-group.dto';
import { SendChatMessageDto } from './dto/send-chat-message.dto';
import { Roles } from '../auth/roles';

const userSelect = {
  id: true,
  fullName: true,
  profileImage: true,
} as const;

const ownerSelect = {
  id: true,
  organizationName: true,
} as const;

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly images: ImageUploadService,
    private readonly media: ChatMediaService,
  ) {}

  private readonly messageInclude = {
    senderUser: { select: userSelect },
    senderOwner: { select: ownerSelect },
  };

  async createGroup(
    paddleOwnerId: number,
    dto: CreateChatGroupDto,
    image?: Express.Multer.File,
  ) {
    const imageUrl = await this.images.saveProfileImage(image);
    return this.prisma.chatGroup.create({
      data: {
        name: dto.name.trim(),
        description: dto.description?.trim() || undefined,
        image: imageUrl,
        paddleOwnerId,
      },
      include: this.groupListInclude(),
    });
  }

  findMine(paddleOwnerId: number) {
    return this.prisma.chatGroup.findMany({
      where: { paddleOwnerId, courtBooking: null },
      orderBy: { updatedAt: 'desc' },
      include: this.groupListInclude(),
    });
  }

  async unreadCount(userId: number) {
    let count = 0;

    const memberships = await this.prisma.chatGroupMember.findMany({
      where: { userId },
      select: { groupId: true, lastReadAt: true },
    });
    for (const row of memberships) {
      const last = await this.prisma.chatMessage.findFirst({
        where: { groupId: row.groupId },
        orderBy: { createdAt: 'desc' },
        select: { senderUserId: true, senderOwnerId: true, createdAt: true },
      });
      if (!last) continue;
      if (last.senderUserId === userId && last.senderOwnerId == null) continue;
      if (!row.lastReadAt || last.createdAt > row.lastReadAt) count += 1;
    }

    const playerChats = await this.prisma.userConversation.findMany({
      where: { OR: [{ userLowId: userId }, { userHighId: userId }] },
      select: {
        userLowId: true,
        userLowLastReadAt: true,
        userHighLastReadAt: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { senderUserId: true, createdAt: true },
        },
      },
    });
    for (const chat of playerChats) {
      const last = chat.messages[0];
      if (!last || last.senderUserId === userId) continue;
      const lastReadAt =
        chat.userLowId === userId
          ? chat.userLowLastReadAt
          : chat.userHighLastReadAt;
      if (!lastReadAt || last.createdAt > lastReadAt) count += 1;
    }

    const matches = await this.prisma.matchParticipant.findMany({
      where: { userId, status: 'ACCEPTED' },
      select: { matchId: true, lastReadAt: true },
    });
    for (const row of matches) {
      const last = await this.prisma.matchChatMessage.findFirst({
        where: { matchId: row.matchId },
        orderBy: { createdAt: 'desc' },
        select: { senderUserId: true, senderRefereeId: true, createdAt: true },
      });
      if (!last) continue;
      if (last.senderUserId === userId && last.senderRefereeId == null) continue;
      if (!row.lastReadAt || last.createdAt > row.lastReadAt) count += 1;
    }

    const coachChats = await this.prisma.coachConversation.findMany({
      where: { userId },
      select: {
        userLastReadAt: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { senderCoachId: true, createdAt: true },
        },
      },
    });
    for (const chat of coachChats) {
      const last = chat.messages[0];
      if (!last?.senderCoachId) continue;
      if (!chat.userLastReadAt || last.createdAt > chat.userLastReadAt) {
        count += 1;
      }
    }

    return { count };
  }

  async findAllForUser(userId: number) {
    // Community groups are public; court-booking groups only for members.
    const groups = await this.prisma.chatGroup.findMany({
      where: {
        OR: [
          { courtBooking: null },
          { members: { some: { userId } } },
        ],
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        ...this.groupListInclude(),
        members: {
          where: { userId },
          select: { id: true, lastReadAt: true, joinedAt: true },
        },
        joinRequests: {
          where: { userId },
          select: { id: true, status: true },
          take: 1,
        },
        courtBooking: {
          select: {
            id: true,
            bookingDate: true,
            court: { select: { name: true } },
            timeSlot: { select: { startTime: true } },
          },
        },
      },
    });
    return Promise.all(
      groups.map(async (g) => {
        const { members, joinRequests, courtBooking, ...rest } = g;
        const isMember = members.length > 0;
        let unreadCount = 0;
        if (isMember) {
          // Prefer last read; otherwise only count messages after joining.
          const since = members[0].lastReadAt ?? members[0].joinedAt;
          unreadCount = await this.prisma.chatMessage.count({
            where: {
              groupId: g.id,
              NOT: {
                AND: [{ senderUserId: userId }, { senderOwnerId: null }],
              },
              ...(since ? { createdAt: { gt: since } } : {}),
            },
          });
        }
        const isCourtBookingGroup = Boolean(courtBooking);
        let displayTitle = rest.name;
        if (isCourtBookingGroup) {
          const dateStr = courtBooking?.bookingDate
            ? new Date(courtBooking.bookingDate).toISOString().slice(0, 10)
            : '';
          const built = [
            courtBooking?.court?.name,
            dateStr,
            courtBooking?.timeSlot?.startTime,
          ]
            .filter(Boolean)
            .join(' · ');
          displayTitle =
            built ||
            rest.description ||
            (rest.name === 'Court Booking' ? 'Court Booking' : rest.name);
        }
        return {
          ...rest,
          courtBooking,
          isCourtBookingGroup,
          displayTitle,
          isMember,
          joinStatus: joinRequests[0]?.status || null,
          joinRequestId: joinRequests[0]?.id || null,
          unreadCount,
        };
      }),
    );
  }

  async findOne(id: string, auth: { userId: number; role?: string }) {
    const group = await this.prisma.chatGroup.findUnique({
      where: { id },
      include: {
        paddleOwner: { select: ownerSelect },
        _count: { select: { members: true } },
      },
    });
    if (!group) throw new NotFoundException('Group not found');
    await this.assertCanView(group, auth);
    return group;
  }

  async requestJoin(userId: number, groupId: string) {
    await this.getGroup(groupId);
    const bookingLink = await this.prisma.courtBooking.findUnique({
      where: { chatGroupId: groupId },
      select: { id: true },
    });
    if (bookingLink) {
      throw new ForbiddenException(
        'This chat is only for players on that court booking',
      );
    }
    const member = await this.prisma.chatGroupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (member) throw new ConflictException('You are already in this group');

    const existing = await this.prisma.chatJoinRequest.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (existing?.status === ChatJoinStatus.PENDING) {
      throw new ConflictException('Join request already sent');
    }
    if (existing?.status === ChatJoinStatus.ACCEPTED) {
      throw new ConflictException('You are already in this group');
    }

    if (existing) {
      return this.prisma.chatJoinRequest.update({
        where: { id: existing.id },
        data: { status: ChatJoinStatus.PENDING },
        include: { user: { select: userSelect } },
      });
    }

    return this.prisma.chatJoinRequest.create({
      data: { groupId, userId, status: ChatJoinStatus.PENDING },
      include: { user: { select: userSelect } },
    });
  }

  async listRequests(paddleOwnerId: number, groupId: string) {
    const group = await this.getGroup(groupId);
    this.assertOwner(group, paddleOwnerId);
    return this.prisma.chatJoinRequest.findMany({
      where: { groupId, status: ChatJoinStatus.PENDING },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { ...userSelect, mobileNumber: true } } },
    });
  }

  async acceptRequest(
    paddleOwnerId: number,
    groupId: string,
    requestId: string,
  ) {
    const group = await this.getGroup(groupId);
    this.assertOwner(group, paddleOwnerId);
    const request = await this.prisma.chatJoinRequest.findUnique({
      where: { id: requestId },
    });
    if (!request || request.groupId !== groupId) {
      throw new NotFoundException('Join request not found');
    }
    if (request.status !== ChatJoinStatus.PENDING) {
      throw new BadRequestException('This request is no longer pending');
    }

    await this.prisma.$transaction([
      this.prisma.chatGroupMember.upsert({
        where: { groupId_userId: { groupId, userId: request.userId } },
        create: { groupId, userId: request.userId },
        update: {},
      }),
      this.prisma.chatJoinRequest.update({
        where: { id: requestId },
        data: { status: ChatJoinStatus.ACCEPTED },
      }),
    ]);

    await this.prisma.notification.create({
      data: {
        receiverId: request.userId,
        senderId: paddleOwnerId,
        type: 'Chat Group',
        message: `Your request to join ${group.name} was accepted.`,
        meta: { action: 'CHAT_JOIN_ACCEPTED', groupId },
      },
    });

    return { message: 'User added to the group' };
  }

  async rejectRequest(
    paddleOwnerId: number,
    groupId: string,
    requestId: string,
  ) {
    const group = await this.getGroup(groupId);
    this.assertOwner(group, paddleOwnerId);
    const request = await this.prisma.chatJoinRequest.findUnique({
      where: { id: requestId },
    });
    if (!request || request.groupId !== groupId) {
      throw new NotFoundException('Join request not found');
    }
    await this.prisma.chatJoinRequest.update({
      where: { id: requestId },
      data: { status: ChatJoinStatus.REJECTED },
    });
    return { message: 'Request rejected' };
  }

  async listMessages(
    auth: { userId: number; role?: string },
    groupId: string,
    after?: string,
  ) {
    const group = await this.getGroup(groupId);
    await this.assertCanChat(group, auth);

    if (auth.role !== Roles.PADDLE_OWNER && !after) {
      await this.prisma.chatGroupMember.updateMany({
        where: { groupId, userId: auth.userId },
        data: { lastReadAt: new Date() },
      });
    }

    const afterMsg = after
      ? await this.prisma.chatMessage.findUnique({ where: { id: after } })
      : null;

    return this.prisma.chatMessage.findMany({
      where: {
        groupId,
        ...(afterMsg ? { createdAt: { gt: afterMsg.createdAt } } : {}),
      },
      orderBy: { createdAt: 'asc' },
      take: afterMsg ? 100 : 80,
      include: this.messageInclude,
    });
  }

  async sendMessage(
    auth: { userId: number; role?: string },
    groupId: string,
    dto: SendChatMessageDto,
    file?: Express.Multer.File,
  ) {
    const group = await this.getGroup(groupId);
    await this.assertCanChat(group, auth);

    const isOwner = auth.role === Roles.PADDLE_OWNER;
    let mediaUrl: string | undefined;
    let fileName: string | undefined;
    let mimeType: string | undefined;

    if (dto.type === ChatMessageType.TEXT) {
      const text = dto.text?.trim();
      if (!text) throw new BadRequestException('Message text is required');
    } else {
      if (!file) throw new BadRequestException('A file is required for this message type');
      const saved = await this.media.save(file, dto.type);
      mediaUrl = saved.url;
      fileName = saved.fileName;
      mimeType = saved.mimeType;
    }

    const message = await this.prisma.chatMessage.create({
      data: {
        groupId,
        type: dto.type,
        text: dto.text?.trim() || undefined,
        mediaUrl,
        fileName,
        mimeType,
        durationSec: dto.durationSec,
        ...(isOwner
          ? { senderOwnerId: auth.userId }
          : { senderUserId: auth.userId }),
      },
      include: this.messageInclude,
    });

    await this.prisma.chatGroup.update({
      where: { id: groupId },
      data: { updatedAt: new Date() },
    });

    return message;
  }

  private groupListInclude() {
    return {
      paddleOwner: { select: ownerSelect },
      messages: {
        orderBy: { createdAt: 'desc' as const },
        take: 1,
        include: this.messageInclude,
      },
      _count: {
        select: {
          members: true,
          joinRequests: { where: { status: ChatJoinStatus.PENDING } },
        },
      },
    };
  }

  private async getGroup(id: string) {
    const group = await this.prisma.chatGroup.findUnique({ where: { id } });
    if (!group) throw new NotFoundException('Group not found');
    return group;
  }

  private assertOwner(
    group: { paddleOwnerId: number },
    paddleOwnerId: number,
  ) {
    if (group.paddleOwnerId !== paddleOwnerId) {
      throw new ForbiddenException('Not your group');
    }
  }

  private async assertCanView(
    group: { paddleOwnerId: number; id: string },
    auth: { userId: number; role?: string },
  ) {
    if (auth.role === Roles.PADDLE_OWNER) {
      this.assertOwner(group, auth.userId);
      return;
    }
    const member = await this.prisma.chatGroupMember.findUnique({
      where: { groupId_userId: { groupId: group.id, userId: auth.userId } },
    });
    if (!member) {
      throw new ForbiddenException('Join this group to view it');
    }
  }

  private async assertCanChat(
    group: { paddleOwnerId: number; id: string },
    auth: { userId: number; role?: string },
  ) {
    if (auth.role === Roles.PADDLE_OWNER) {
      this.assertOwner(group, auth.userId);
      return;
    }
    const member = await this.prisma.chatGroupMember.findUnique({
      where: { groupId_userId: { groupId: group.id, userId: auth.userId } },
    });
    if (!member) {
      throw new ForbiddenException('You must be a member to chat');
    }
  }
}
