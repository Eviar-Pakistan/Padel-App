import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus, Prisma, WeekDay } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ImageUploadService } from '../common/image-upload.service';
import { CreateCoachDto } from './dto/create-coach.dto';
import { UpdateCoachDto } from './dto/update-coach.dto';
import { CreateCoachReviewDto } from './dto/create-coach-review.dto';
import { CreateCoachBookingDto } from './dto/create-coach-booking.dto';
import { UpdateCoachBookingStatusDto } from './dto/update-coach-booking-status.dto';

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
  ) {}

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
    return this.prisma.coach.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        profileImage,
        email: dto.email,
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
        isVerified: dto.isVerified ?? false,
        status: dto.status,
        ...(paddleOwnerId ? { paddleOwnerId } : {}),
      },
    });
  }

  findAll() {
    return this.prisma.coach
      .findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          reviews: this.reviewInclude,
        },
      })
      .then((coaches) => this.attachOwners(coaches));
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
    return withOwner;
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

    return this.prisma.coach.update({
      where: { id },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        ...(profileImage ? { profileImage } : {}),
        ...(paddleOwnerId && !existing.paddleOwnerId ? { paddleOwnerId } : {}),
        email: dto.email,
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
      status: BookingStatus.CONFIRMED,
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
    }

    return updated;
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
