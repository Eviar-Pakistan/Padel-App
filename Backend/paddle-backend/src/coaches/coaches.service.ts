import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { BookingStatus, ChatMessageType, Prisma, WeekDay } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ImageUploadService } from '../common/image-upload.service';
import { ChatMediaService } from '../chat/chat-media.service';
import { Roles } from '../auth/roles';
import { CreateCoachDto } from './dto/create-coach.dto';
import { UpdateCoachDto } from './dto/update-coach.dto';
import { CreateCoachReviewDto } from './dto/create-coach-review.dto';
import { CreateCoachBookingDto } from './dto/create-coach-booking.dto';
import { UpdateCoachBookingStatusDto } from './dto/update-coach-booking-status.dto';
import { CoachLoginDto } from './dto/coach-login.dto';
import { SendChatMessageDto } from '../chat/dto/send-chat-message.dto';

const WEEK_ORDER: WeekDay[] = [
  WeekDay.MON,
  WeekDay.TUE,
  WeekDay.WED,
  WeekDay.THU,
  WeekDay.FRI,
  WeekDay.SAT,
  WeekDay.SUN,
];

const JS_TO_WEEK: WeekDay[] = [
  WeekDay.SUN,
  WeekDay.MON,
  WeekDay.TUE,
  WeekDay.WED,
  WeekDay.THU,
  WeekDay.FRI,
  WeekDay.SAT,
];

@Injectable()
export class CoachesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly imageUpload: ImageUploadService,
    private readonly jwtService: JwtService,
    private readonly chatMedia: ChatMediaService,
  ) {}

  private sanitizeCoach<T extends { password?: string | null }>(coach: T) {
    const { password: _password, ...rest } = coach;
    return rest;
  }

  private readonly ownerSelect = {
    id: true,
    organizationName: true,
    location: true,
  } as const;

  private readonly reviewInclude = {
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' as const },
  };

  private readonly bookingInclude = {
    user: {
      select: {
        id: true,
        fullName: true,
        mobileNumber: true,
        profileImage: true,
      },
    },
    coach: {
      select: {
        id: true,
        firstName: true,
        lastName: true,
        profileImage: true,
        sessionRate: true,
        paddleOwner: { select: this.ownerSelect },
      },
    },
  };

  async create(
    dto: CreateCoachDto,
    file?: Express.Multer.File,
    paddleOwnerId?: number,
  ) {
    const profileImage = await this.imageUpload.saveProfileImage(file);
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const coach = await this.prisma.coach.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        profileImage,
        email: dto.email.trim().toLowerCase(),
        phoneNumber: dto.phoneNumber,
        password: passwordHash,
        gender: dto.gender,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        nationality: dto.nationality,
        languages: dto.languages
          ? (dto.languages as Prisma.InputJsonValue)
          : undefined,
        bio: dto.bio,
        yearsOfExperience: dto.yearsOfExperience,
        certificationLevel: dto.certificationLevel,
        specialties: dto.specialties
          ? (dto.specialties as Prisma.InputJsonValue)
          : undefined,
        sessionRate: dto.sessionRate,
        availableFromDay: dto.availableFromDay,
        availableToDay: dto.availableToDay,
        availableFromTime: dto.availableFromTime,
        availableToTime: dto.availableToTime,
        isVerified: dto.isVerified ?? false,
        status: dto.status,
        ...(paddleOwnerId ? { paddleOwnerId } : {}),
      },
    });
    return this.sanitizeCoach(coach);
  }

  async login(dto: CoachLoginDto) {
    const coach = await this.prisma.coach.findUnique({
      where: { email: dto.email.trim().toLowerCase() },
    });
    if (!coach?.password) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const ok = await bcrypt.compare(dto.password, coach.password);
    if (!ok) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (coach.status !== 'ACTIVE') {
      throw new UnauthorizedException('Coach account is not active');
    }
    const access_token = await this.jwtService.signAsync({
      sub: coach.id,
      email: coach.email,
      role: Roles.COACH,
    });
    return {
      access_token,
      coach: this.sanitizeCoach(coach),
    };
  }

  async me(coachId: string) {
    return this.findOne(coachId);
  }

  findAll() {
    return this.prisma.coach
      .findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          reviews: this.reviewInclude,
        },
      })
      .then((coaches) => this.attachOwners(coaches))
      .then((coaches) => coaches.map((c) => this.sanitizeCoach(c)));
  }

  async findOne(id: string) {
    const coach = await this.prisma.coach.findUnique({
      where: { id },
      include: {
        reviews: this.reviewInclude,
      },
    });
    if (!coach) {
      throw new NotFoundException('Coach not found');
    }
    const [withOwner] = await this.attachOwners([coach]);
    return this.sanitizeCoach(withOwner);
  }

  private async attachOwners<T extends { paddleOwnerId?: number | null }>(
    coaches: T[],
  ) {
    const ids = [
      ...new Set(
        coaches
          .map((c) => c.paddleOwnerId)
          .filter((id): id is number => typeof id === 'number'),
      ),
    ];
    if (!ids.length) {
      return coaches.map((c) => ({ ...c, paddleOwner: null }));
    }
    const owners = await this.prisma.paddleOwner.findMany({
      where: { id: { in: ids } },
      select: this.ownerSelect,
    });
    const map = new Map(owners.map((o) => [o.id, o]));
    return coaches.map((c) => ({
      ...c,
      paddleOwner:
        c.paddleOwnerId != null ? (map.get(c.paddleOwnerId) ?? null) : null,
    }));
  }

  async update(
    id: string,
    dto: UpdateCoachDto,
    file?: Express.Multer.File,
    paddleOwnerId?: number,
  ) {
    const existing = await this.findOne(id);
    const profileImage = await this.imageUpload.saveProfileImage(file);
    const passwordHash = dto.password
      ? await bcrypt.hash(dto.password, 10)
      : undefined;

    const coach = await this.prisma.coach.update({
      where: { id },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        ...(profileImage ? { profileImage } : {}),
        ...(paddleOwnerId && !existing.paddleOwnerId ? { paddleOwnerId } : {}),
        ...(passwordHash ? { password: passwordHash } : {}),
        ...(dto.email ? { email: dto.email.trim().toLowerCase() } : {}),
        phoneNumber: dto.phoneNumber,
        gender: dto.gender,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        nationality: dto.nationality,
        languages: dto.languages
          ? (dto.languages as Prisma.InputJsonValue)
          : undefined,
        bio: dto.bio,
        yearsOfExperience: dto.yearsOfExperience,
        certificationLevel: dto.certificationLevel,
        specialties: dto.specialties
          ? (dto.specialties as Prisma.InputJsonValue)
          : undefined,
        sessionRate: dto.sessionRate,
        availableFromDay: dto.availableFromDay,
        availableToDay: dto.availableToDay,
        availableFromTime: dto.availableFromTime,
        availableToTime: dto.availableToTime,
        isVerified: dto.isVerified,
        status: dto.status,
      },
    });
    return this.sanitizeCoach(coach);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.coach.delete({ where: { id } });
    return { message: 'Coach deleted successfully' };
  }

  async getReviews(coachId: string) {
    await this.findOne(coachId);
    return this.prisma.coachReview.findMany({
      where: { coachId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addReview(coachId: string, userId: number, dto: CreateCoachReviewDto) {
    await this.findOne(coachId);

    const existing = await this.prisma.coachReview.findUnique({
      where: {
        coachId_userId: { coachId, userId },
      },
    });
    if (existing) {
      throw new ConflictException('You have already reviewed this coach');
    }

    const review = await this.prisma.coachReview.create({
      data: {
        coachId,
        userId,
        rating: dto.rating,
        comment: dto.comment,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    await this.recalculateCoachRating(coachId);
    return review;
  }

  async createBooking(
    userId: number,
    coachId: string,
    dto: CreateCoachBookingDto,
  ) {
    const coach = await this.findOne(coachId);
    if (coach.status !== 'ACTIVE') {
      throw new BadRequestException('This coach is not available');
    }

    const bookingDate = this.toDateOnly(dto.bookingDate);
    this.assertDateAllowed(dto.bookingDate, coach);
    this.assertTimeAllowed(dto.startTime, dto.bookingDate, coach);

    const endTime = this.addHour(dto.startTime);
    const existing = await this.prisma.coachBooking.findUnique({
      where: {
        coachId_bookingDate_startTime: {
          coachId,
          bookingDate,
          startTime: dto.startTime,
        },
      },
    });
    if (existing && existing.status !== BookingStatus.CANCELLED) {
      throw new ConflictException('This session is already booked');
    }

    const totalPrice = new Prisma.Decimal(Number(coach.sessionRate) || 0);
    const data = {
      userId,
      status: BookingStatus.PENDING,
      totalPrice,
      notes: dto.notes,
      endTime,
    };

    if (existing?.status === BookingStatus.CANCELLED) {
      return this.prisma.coachBooking.update({
        where: { id: existing.id },
        data,
        include: this.bookingInclude,
      });
    }

    return this.prisma.coachBooking.create({
      data: {
        coachId,
        bookingDate,
        startTime: dto.startTime,
        ...data,
      },
      include: this.bookingInclude,
    });
  }

  findMyBookings(userId: number) {
    return this.prisma.coachBooking.findMany({
      where: { userId },
      orderBy: [{ bookingDate: 'desc' }, { startTime: 'asc' }],
      include: this.bookingInclude,
    });
  }

  async findOwnerBookings(paddleOwnerId: number) {
    await this.prisma.coach.updateMany({
      where: { paddleOwnerId: null },
      data: { paddleOwnerId },
    });
    return this.prisma.coachBooking.findMany({
      where: {
        OR: [
          { coach: { paddleOwnerId } },
          { coach: { paddleOwnerId: null } },
        ],
      },
      orderBy: [{ bookingDate: 'desc' }, { createdAt: 'desc' }],
      include: this.bookingInclude,
    });
  }

  private coachBookingStatusMessage(
    coachName: string,
    bookingDate: Date,
    status: BookingStatus,
  ): string {
    const dateStr = bookingDate.toISOString().slice(0, 10);
    const coach = coachName || 'your coach';
    switch (status) {
      case BookingStatus.PENDING:
        return `Your session with ${coach} on ${dateStr} is pending.`;
      case BookingStatus.CONFIRMED:
        return `Your session with ${coach} on ${dateStr} has been confirmed.`;
      case BookingStatus.CANCELLED:
        return `Your session with ${coach} on ${dateStr} has been cancelled.`;
      case BookingStatus.COMPLETED:
        return `Your session with ${coach} on ${dateStr} has been marked completed.`;
      default:
        return `Your session with ${coach} on ${dateStr} status was updated to ${status}.`;
    }
  }

  async updateBookingStatus(
    bookingId: string,
    paddleOwnerId: number,
    dto: UpdateCoachBookingStatusDto,
  ) {
    const booking = await this.prisma.coachBooking.findUnique({
      where: { id: bookingId },
      include: {
        coach: {
          select: {
            paddleOwnerId: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (
      booking.coach.paddleOwnerId != null &&
      booking.coach.paddleOwnerId !== paddleOwnerId
    ) {
      throw new ForbiddenException('Not your coach booking');
    }

    const updated = await this.prisma.coachBooking.update({
      where: { id: bookingId },
      data: { status: dto.status },
      include: this.bookingInclude,
    });

    if (booking.status !== dto.status) {
      const coachName =
        `Coach ${booking.coach.firstName} ${booking.coach.lastName}`.trim();
      await this.prisma.notification.create({
        data: {
          receiverId: booking.userId,
          senderId: paddleOwnerId,
          type: 'Coach Booking',
          message: this.coachBookingStatusMessage(
            coachName,
            booking.bookingDate,
            dto.status,
          ),
        },
      });
      if (dto.status === BookingStatus.CONFIRMED) {
        await this.ensureConversation(booking.coachId, booking.userId, booking.id);
      }
    }

    return updated;
  }

  findCoachBookings(coachId: string) {
    return this.prisma.coachBooking.findMany({
      where: { coachId },
      orderBy: [{ bookingDate: 'desc' }, { createdAt: 'desc' }],
      include: this.bookingInclude,
    });
  }

  async respondToBooking(
    coachId: string,
    bookingId: string,
    status: 'CONFIRMED' | 'CANCELLED',
  ) {
    const booking = await this.prisma.coachBooking.findUnique({
      where: { id: bookingId },
      include: {
        coach: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.coachId !== coachId) {
      throw new ForbiddenException('Not your booking');
    }
    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException('This booking is no longer pending');
    }

    const updated = await this.prisma.coachBooking.update({
      where: { id: bookingId },
      data: { status },
      include: this.bookingInclude,
    });

    const coachName =
      `Coach ${booking.coach.firstName} ${booking.coach.lastName}`.trim();
    await this.prisma.notification.create({
      data: {
        receiverId: booking.userId,
        senderId: 0,
        type: 'Coach Booking',
        message: this.coachBookingStatusMessage(
          coachName,
          booking.bookingDate,
          status,
        ),
        meta: {
          coachId,
          bookingId,
          action: status === BookingStatus.CONFIRMED ? 'ACCEPTED' : 'REJECTED',
        } as Prisma.InputJsonValue,
      },
    });

    let conversation: { id: string } | null = null;
    if (status === BookingStatus.CONFIRMED) {
      conversation = await this.ensureConversation(
        coachId,
        booking.userId,
        booking.id,
      );
    }

    return { ...updated, conversation };
  }

  private async ensureConversation(
    coachId: string,
    userId: number,
    bookingId?: string,
  ) {
    const existing = await this.prisma.coachConversation.findUnique({
      where: { coachId_userId: { coachId, userId } },
    });
    if (existing) {
      if (bookingId && !existing.bookingId) {
        return this.prisma.coachConversation.update({
          where: { id: existing.id },
          data: { bookingId },
        });
      }
      return existing;
    }
    return this.prisma.coachConversation.create({
      data: { coachId, userId, bookingId },
    });
  }

  async listCoachConversations(coachId: string) {
    const conversations = await this.prisma.coachConversation.findMany({
      where: { coachId },
      orderBy: { updatedAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            profileImage: true,
            mobileNumber: true,
          },
        },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    return Promise.all(
      conversations.map(async (c) => {
        const unreadCount = await this.prisma.coachConversationMessage.count({
          where: {
            conversationId: c.id,
            senderUserId: { not: null },
            ...(c.coachLastReadAt
              ? { createdAt: { gt: c.coachLastReadAt } }
              : {}),
          },
        });
        return { ...c, unreadCount };
      }),
    );
  }

  listUserCoachConversations(userId: number) {
    return this.prisma.coachConversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        coach: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
          },
        },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
  }

  async listConversationMessages(
    conversationId: string,
    auth: { role?: string; userId: string | number },
    after?: string,
  ) {
    const conversation = await this.prisma.coachConversation.findUnique({
      where: { id: conversationId },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');
    this.assertConversationAccess(conversation, auth);

    // Opening the thread (or staying in it) marks messages as read for that side.
    if (auth.role === Roles.COACH) {
      await this.prisma.coachConversation.update({
        where: { id: conversationId },
        data: { coachLastReadAt: new Date() },
      });
    } else if (auth.role === Roles.USER && !after) {
      await this.prisma.coachConversation.update({
        where: { id: conversationId },
        data: { userLastReadAt: new Date() },
      });
    }

    const afterMsg = after
      ? await this.prisma.coachConversationMessage.findUnique({
          where: { id: after },
        })
      : null;

    return this.prisma.coachConversationMessage.findMany({
      where: {
        conversationId,
        ...(afterMsg ? { createdAt: { gt: afterMsg.createdAt } } : {}),
      },
      orderBy: { createdAt: 'asc' },
      take: afterMsg ? 100 : 80,
      include: {
        senderUser: {
          select: { id: true, fullName: true, profileImage: true },
        },
        senderCoach: {
          select: { id: true, firstName: true, lastName: true, profileImage: true },
        },
      },
    });
  }

  async sendConversationMessage(
    conversationId: string,
    auth: { role?: string; userId: string | number },
    dto: SendChatMessageDto,
    file?: Express.Multer.File,
  ) {
    const conversation = await this.prisma.coachConversation.findUnique({
      where: { id: conversationId },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');
    this.assertConversationAccess(conversation, auth);

    const isCoach = auth.role === Roles.COACH;
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

    const message = await this.prisma.coachConversationMessage.create({
      data: {
        conversationId,
        type: dto.type,
        text: dto.text?.trim() || undefined,
        mediaUrl,
        fileName,
        mimeType,
        durationSec: dto.durationSec,
        ...(isCoach
          ? { senderCoachId: String(auth.userId) }
          : { senderUserId: Number(auth.userId) }),
      },
      include: {
        senderUser: {
          select: { id: true, fullName: true, profileImage: true },
        },
        senderCoach: {
          select: { id: true, firstName: true, lastName: true, profileImage: true },
        },
      },
    });

    await this.prisma.coachConversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return message;
  }

  private assertConversationAccess(
    conversation: { coachId: string; userId: number },
    auth: { role?: string; userId: string | number },
  ) {
    if (auth.role === Roles.COACH) {
      if (conversation.coachId !== String(auth.userId)) {
        throw new ForbiddenException('Not your conversation');
      }
      return;
    }
    if (auth.role === Roles.USER) {
      if (conversation.userId !== Number(auth.userId)) {
        throw new ForbiddenException('Not your conversation');
      }
      return;
    }
    throw new ForbiddenException('Not allowed');
  }

  async removeBooking(bookingId: string, paddleOwnerId: number) {
    const booking = await this.prisma.coachBooking.findUnique({
      where: { id: bookingId },
      include: { coach: { select: { paddleOwnerId: true } } },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (
      booking.coach.paddleOwnerId != null &&
      booking.coach.paddleOwnerId !== paddleOwnerId
    ) {
      throw new ForbiddenException('Not your coach booking');
    }
    await this.prisma.coachBooking.delete({ where: { id: bookingId } });
    return { message: 'Booking deleted successfully' };
  }

  private toDateOnly(dateStr: string) {
    const date = new Date(`${dateStr}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Invalid bookingDate');
    }
    return date;
  }

  private addHour(hhmm: string) {
    const [hStr, mStr = '00'] = hhmm.split(':');
    const next = (Number(hStr) + 1) % 24;
    return `${String(next).padStart(2, '0')}:${mStr}`;
  }

  private assertDateAllowed(
    dateStr: string,
    coach: { availableFromDay?: WeekDay | null; availableToDay?: WeekDay | null },
  ) {
    const today = new Date();
    const todayKey = this.toDateKey(today);
    if (dateStr < todayKey) {
      throw new BadRequestException('Cannot book a past date');
    }
    const [y, m, d] = dateStr.split('-').map(Number);
    const weekday = JS_TO_WEEK[new Date(y, m - 1, d).getDay()];
    if (
      coach.availableFromDay &&
      coach.availableToDay &&
      !this.dayInRange(coach.availableFromDay, coach.availableToDay, weekday)
    ) {
      throw new BadRequestException('Coach is not available on that day');
    }
  }

  private assertTimeAllowed(
    startTime: string,
    dateStr: string,
    coach: {
      availableFromTime?: string | null;
      availableToTime?: string | null;
    },
  ) {
    const from = coach.availableFromTime || '06:00';
    const to = coach.availableToTime || '22:00';
    const inRange =
      from <= to
        ? startTime >= from && startTime < to
        : startTime >= from || startTime < to;
    if (!inRange) {
      throw new BadRequestException('Coach is not available at that time');
    }

    const todayKey = this.toDateKey(new Date());
    if (dateStr === todayKey) {
      const now = new Date();
      const [h, m = '0'] = startTime.split(':');
      const slotMinutes = Number(h) * 60 + Number(m);
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      if (slotMinutes <= nowMinutes) {
        throw new BadRequestException('Cannot book a past time');
      }
    }
  }

  private dayInRange(from: WeekDay, to: WeekDay, day: WeekDay) {
    const a = WEEK_ORDER.indexOf(from);
    const b = WEEK_ORDER.indexOf(to);
    const d = WEEK_ORDER.indexOf(day);
    if (a < 0 || b < 0 || d < 0) return false;
    if (a <= b) return d >= a && d <= b;
    return d >= a || d <= b;
  }

  private toDateKey(d: Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private async recalculateCoachRating(coachId: string) {
    const stats = await this.prisma.coachReview.aggregate({
      where: { coachId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await this.prisma.coach.update({
      where: { id: coachId },
      data: {
        rating: stats._avg.rating
          ? new Prisma.Decimal(stats._avg.rating.toFixed(2))
          : new Prisma.Decimal(0),
        totalReviews: stats._count.rating,
      },
    });
  }
}
