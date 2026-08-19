import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ChatMessageType,
  PlayerChallengeStatus,
  Prisma,
} from '../../generated/prisma/client';
import { ChatMediaService } from '../chat/chat-media.service';
import { SendChatMessageDto } from '../chat/dto/send-chat-message.dto';
import { PrismaService } from '../prisma/prisma.service';

const playerSelect = {
  id: true,
  fullName: true,
  profileImage: true,
  location: true,
  province: true,
  points: true,
  wins: true,
  rank: true,
  skillLevel: true,
  isProfilePublic: true,
} satisfies Prisma.UserSelect;

const DEFAULT_ACCEPT_MESSAGE =
  'I have accepted your challenge. What are the further details?'; // sent by opponent on accept

@Injectable()
export class ChallengesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly chatMedia: ChatMediaService,
  ) {}

  async listPlayers(userId: number) {
    const [players, challenges] = await Promise.all([
      this.prisma.user.findMany({
        where: { isProfilePublic: true, NOT: { id: userId } },
        select: playerSelect,
        orderBy: [{ points: 'desc' }, { wins: 'desc' }, { id: 'asc' }],
      }),
      this.prisma.playerChallenge.findMany({
        where: {
          OR: [{ challengerId: userId }, { opponentId: userId }],
        },
        select: {
          id: true,
          challengerId: true,
          opponentId: true,
          status: true,
          conversationId: true,
        },
      }),
    ]);

    const byOtherId = new Map<
      number,
      {
        id: string;
        status: PlayerChallengeStatus;
        conversationId: string | null;
        direction: 'SENT' | 'RECEIVED';
      }
    >();
    for (const c of challenges) {
      const otherId = c.challengerId === userId ? c.opponentId : c.challengerId;
      const existing = byOtherId.get(otherId);
      if (existing?.status === PlayerChallengeStatus.ACCEPTED) continue;
      byOtherId.set(otherId, {
        id: c.id,
        status: c.status,
        conversationId: c.conversationId,
        direction: c.challengerId === userId ? 'SENT' : 'RECEIVED',
      });
    }

    return players.map((player, index) => {
      const challenge = byOtherId.get(player.id);
      return {
        ...player,
        listRank: index + 1,
        challenge: challenge
          ? {
              id: challenge.id,
              status: challenge.status,
              conversationId: challenge.conversationId,
              direction: challenge.direction,
            }
          : null,
      };
    });
  }

  async listMine(userId: number) {
    const me = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isProfilePublic: true },
    });
    if (!me) throw new NotFoundException('User not found');

    const challenges = await this.prisma.playerChallenge.findMany({
      where: {
        OR: [{ challengerId: userId }, { opponentId: userId }],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        challenger: { select: playerSelect },
        opponent: { select: playerSelect },
      },
    });

    const mapChallenge = (c: (typeof challenges)[number]) => {
      const other = c.challengerId === userId ? c.opponent : c.challenger;
      return {
        id: c.id,
        status: c.status,
        conversationId: c.conversationId,
        direction: c.challengerId === userId ? 'SENT' : 'RECEIVED',
        createdAt: c.createdAt,
        otherPlayer: other,
      };
    };

    return {
      isProfilePublic: me.isProfilePublic,
      incoming: challenges
        .filter(
          (c) =>
            c.opponentId === userId &&
            c.status === PlayerChallengeStatus.PENDING,
        )
        .map(mapChallenge),
      outgoing: challenges
        .filter(
          (c) =>
            c.challengerId === userId &&
            c.status === PlayerChallengeStatus.PENDING,
        )
        .map(mapChallenge),
      accepted: challenges
        .filter((c) => c.status === PlayerChallengeStatus.ACCEPTED)
        .map(mapChallenge),
    };
  }

  async create(challengerId: number, opponentId: number) {
    if (challengerId === opponentId) {
      throw new BadRequestException('You cannot challenge yourself');
    }

    const opponent = await this.prisma.user.findUnique({
      where: { id: opponentId },
      select: { id: true, fullName: true, isProfilePublic: true },
    });
    if (!opponent) throw new NotFoundException('Player not found');
    if (!opponent.isProfilePublic) {
      throw new BadRequestException('This player is not open to challenges');
    }

    const existing = await this.prisma.playerChallenge.findFirst({
      where: {
        OR: [
          { challengerId, opponentId },
          { challengerId: opponentId, opponentId: challengerId },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existing?.status === PlayerChallengeStatus.PENDING) {
      if (existing.challengerId === challengerId) {
        throw new ConflictException('Challenge already sent');
      }
      throw new ConflictException(
        'This player already challenged you. Accept it from My Challenges.',
      );
    }
    if (existing?.status === PlayerChallengeStatus.ACCEPTED) {
      throw new ConflictException(
        'You already have an accepted challenge with this player. Chat to discuss.',
      );
    }

    const challenger = await this.prisma.user.findUnique({
      where: { id: challengerId },
      select: { fullName: true },
    });
    const challengerName = challenger?.fullName || 'A player';

    const challenge = await this.prisma.playerChallenge.create({
      data: { challengerId, opponentId },
      include: {
        challenger: { select: playerSelect },
        opponent: { select: playerSelect },
      },
    });

    await this.prisma.notification.create({
      data: {
        receiverId: opponentId,
        senderId: challengerId,
        type: 'Player Challenge',
        message: `${challengerName} has challenged you.`,
        meta: {
          action: 'ACCEPT_CHALLENGE',
          challengeId: challenge.id,
        },
      },
    });

    return challenge;
  }

  async accept(userId: number, challengeId: string) {
    const me = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, fullName: true, isProfilePublic: true },
    });
    if (!me) throw new NotFoundException('User not found');
    if (!me.isProfilePublic) {
      throw new BadRequestException(
        'Make your profile public to accept challenges',
      );
    }

    const challenge = await this.prisma.playerChallenge.findUnique({
      where: { id: challengeId },
    });
    if (!challenge) throw new NotFoundException('Challenge not found');
    if (challenge.opponentId !== userId) {
      throw new ForbiddenException('Only the challenged player can accept');
    }

    if (challenge.status === PlayerChallengeStatus.ACCEPTED) {
      return this.getChallenge(challenge.id);
    }

    const { userLowId, userHighId } = this.pairIds(
      challenge.challengerId,
      challenge.opponentId,
    );

    const conversation = await this.prisma.userConversation.upsert({
      where: { userLowId_userHighId: { userLowId, userHighId } },
      create: { userLowId, userHighId },
      update: {},
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.playerChallenge.update({
        where: { id: challenge.id },
        data: {
          status: PlayerChallengeStatus.ACCEPTED,
          conversationId: conversation.id,
        },
      });

      await tx.userConversationMessage.create({
        data: {
          conversationId: conversation.id,
          senderUserId: userId,
          type: ChatMessageType.TEXT,
          text: DEFAULT_ACCEPT_MESSAGE,
        },
      });

      await tx.userConversation.update({
        where: { id: conversation.id },
        data: { updatedAt: new Date() },
      });

      await tx.notification.create({
        data: {
          receiverId: challenge.challengerId,
          senderId: userId,
          type: 'Challenge Accepted',
          message:
            'Your challenge has been accepted. Chat further to discuss.',
          meta: {
            action: 'OPEN_CHALLENGE_CHAT',
            challengeId: challenge.id,
            conversationId: conversation.id,
          },
        },
      });
    });

    await this.markChallengeNotificationsResolved(userId, challenge.id);

    return this.getChallenge(challenge.id);
  }

  async listConversations(userId: number) {
    const conversations = await this.prisma.userConversation.findMany({
      where: { OR: [{ userLowId: userId }, { userHighId: userId }] },
      orderBy: { updatedAt: 'desc' },
      include: {
        userLow: { select: playerSelect },
        userHigh: { select: playerSelect },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    return conversations.map((c) => ({
      ...c,
      otherUser: c.userLowId === userId ? c.userHigh : c.userLow,
    }));
  }

  async listMessages(userId: number, conversationId: string, after?: string) {
    const conversation = await this.getConversationForUser(
      userId,
      conversationId,
    );

    if (!after) {
      const isLow = conversation.userLowId === userId;
      await this.prisma.userConversation.update({
        where: { id: conversation.id },
        data: isLow
          ? { userLowLastReadAt: new Date() }
          : { userHighLastReadAt: new Date() },
      });
    }

    const afterMsg = after
      ? await this.prisma.userConversationMessage.findUnique({
          where: { id: after },
        })
      : null;

    return this.prisma.userConversationMessage.findMany({
      where: {
        conversationId: conversation.id,
        ...(afterMsg ? { createdAt: { gt: afterMsg.createdAt } } : {}),
      },
      orderBy: { createdAt: 'asc' },
      take: afterMsg ? 100 : 80,
      include: {
        senderUser: {
          select: { id: true, fullName: true, profileImage: true },
        },
      },
    });
  }

  async sendMessage(
    userId: number,
    conversationId: string,
    dto: SendChatMessageDto,
    file?: Express.Multer.File,
  ) {
    const conversation = await this.getConversationForUser(
      userId,
      conversationId,
    );

    let mediaUrl: string | undefined;
    let fileName: string | undefined;
    let mimeType: string | undefined;

    if (dto.type === ChatMessageType.TEXT) {
      const text = dto.text?.trim();
      if (!text) throw new BadRequestException('Message text is required');
    } else {
      if (!file) {
        throw new BadRequestException('A file is required for this message type');
      }
      const saved = await this.chatMedia.save(file, dto.type);
      mediaUrl = saved.url;
      fileName = saved.fileName;
      mimeType = saved.mimeType;
    }

    const message = await this.prisma.userConversationMessage.create({
      data: {
        conversationId: conversation.id,
        senderUserId: userId,
        type: dto.type,
        text: dto.text?.trim() || undefined,
        mediaUrl,
        fileName,
        mimeType,
        durationSec: dto.durationSec,
      },
      include: {
        senderUser: {
          select: { id: true, fullName: true, profileImage: true },
        },
      },
    });

    await this.prisma.userConversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });

    return message;
  }

  private async getChallenge(id: string) {
    const challenge = await this.prisma.playerChallenge.findUnique({
      where: { id },
      include: {
        challenger: { select: playerSelect },
        opponent: { select: playerSelect },
      },
    });
    if (!challenge) throw new NotFoundException('Challenge not found');
    return challenge;
  }

  private async getConversationForUser(userId: number, conversationId: string) {
    const conversation = await this.prisma.userConversation.findUnique({
      where: { id: conversationId },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');
    if (
      conversation.userLowId !== userId &&
      conversation.userHighId !== userId
    ) {
      throw new ForbiddenException('Not your conversation');
    }
    return conversation;
  }

  private pairIds(a: number, b: number) {
    return a < b
      ? { userLowId: a, userHighId: b }
      : { userLowId: b, userHighId: a };
  }

  private async markChallengeNotificationsResolved(
    receiverId: number,
    challengeId: string,
  ) {
    const notifications = await this.prisma.notification.findMany({
      where: { receiverId, type: 'Player Challenge' },
    });
    for (const n of notifications) {
      const meta =
        n.meta && typeof n.meta === 'object' && !Array.isArray(n.meta)
          ? (n.meta as Record<string, unknown>)
          : null;
      if (meta?.challengeId !== challengeId) continue;
      await this.prisma.notification.update({
        where: { id: n.id },
        data: {
          isRead: true,
          meta: { ...meta, resolved: true, action: 'CHALLENGE_ACCEPTED' },
        },
      });
    }
  }
}
