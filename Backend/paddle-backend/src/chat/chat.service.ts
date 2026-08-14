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
      where: { paddleOwnerId },
      orderBy: { updatedAt: 'desc' },
      include: this.groupListInclude(),
    });
  }

  async findAllForUser(userId: number) {
    const groups = await this.prisma.chatGroup.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        ...this.groupListInclude(),
        members: { where: { userId }, select: { id: true } },
        joinRequests: {
          where: { userId },
          select: { id: true, status: true },
          take: 1,
        },
      },
    });
    return groups.map((g) => {
      const { members, joinRequests, ...rest } = g;
      return {
        ...rest,
        isMember: members.length > 0,
        joinStatus: joinRequests[0]?.status || null,
        joinRequestId: joinRequests[0]?.id || null,
      };
    });
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
