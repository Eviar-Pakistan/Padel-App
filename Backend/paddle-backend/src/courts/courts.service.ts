import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus, Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ImageUploadService } from '../common/image-upload.service';
import { CreateCourtDto } from './dto/create-court.dto';
import { UpdateCourtDto } from './dto/update-court.dto';
import { CreateCourtBookingDto } from './dto/create-court-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';

@Injectable()
export class CourtsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly imageUpload: ImageUploadService,
  ) {}

  private assertValidSlots(
    slots: { startTime: string; endTime: string }[],
  ) {
    for (const slot of slots) {
      if (!slot.startTime || !slot.endTime) {
        throw new BadRequestException(
          'Each time slot must include startTime and endTime (HH:mm)',
        );
      }
      if (slot.startTime >= slot.endTime) {
        throw new BadRequestException(
          `Invalid slot ${slot.startTime}-${slot.endTime}: start must be before end`,
        );
      }
    }
  }

  private toDateOnly(dateStr: string) {
    const date = new Date(`${dateStr}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Invalid bookingDate');
    }
    return date;
  }

  async create(
    paddleOwnerId: number,
    dto: CreateCourtDto,
    files: Express.Multer.File[] = [],
  ) {
    this.assertValidSlots(dto.timeSlots);
    const images = await this.imageUpload.saveCourtImages(files);

    return this.prisma.court.create({
      data: {
        name: dto.name,
        images,
        pricePerHour: dto.pricePerHour,
        isActive: dto.isActive ?? true,
        paddleOwnerId,
        timeSlots: {
          create: dto.timeSlots.map((slot) => ({
            startTime: slot.startTime,
            endTime: slot.endTime,
          })),
        },
      },
      include: { timeSlots: { orderBy: { startTime: 'asc' } } },
    });
  }

  findAll() {
    return this.prisma.court.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      include: {
        timeSlots: { orderBy: { startTime: 'asc' } },
        paddleOwner: {
          select: {
            id: true,
            organizationName: true,
            location: true,
          },
        },
      },
    });
  }

  findMine(paddleOwnerId: number) {
    return this.prisma.court.findMany({
      where: { paddleOwnerId },
      orderBy: { createdAt: 'desc' },
      include: {
        timeSlots: { orderBy: { startTime: 'asc' } },
      },
    });
  }

  async findOne(id: string) {
    const court = await this.prisma.court.findUnique({
      where: { id },
      include: {
        timeSlots: { orderBy: { startTime: 'asc' } },
        paddleOwner: {
          select: {
            id: true,
            organizationName: true,
            location: true,
          },
        },
      },
    });
    if (!court) {
      throw new NotFoundException('Court not found');
    }
    return court;
  }

  async update(
    id: string,
    paddleOwnerId: number,
    dto: UpdateCourtDto,
    files: Express.Multer.File[] = [],
  ) {
    const court = await this.findOne(id);
    if (court.paddleOwnerId !== paddleOwnerId) {
      throw new ForbiddenException('You can only update your own courts');
    }

    if (dto.timeSlots) {
      this.assertValidSlots(dto.timeSlots);
    }

    const uploaded = await this.imageUpload.saveCourtImages(files);
    const kept = dto.existingImages ?? (Array.isArray(court.images) ? (court.images as string[]) : []);
    const images = [...kept, ...uploaded];

    return this.prisma.$transaction(async (tx) => {
      if (dto.timeSlots) {
        await tx.courtTimeSlot.deleteMany({ where: { courtId: id } });
        await tx.courtTimeSlot.createMany({
          data: dto.timeSlots.map((slot) => ({
            courtId: id,
            startTime: slot.startTime,
            endTime: slot.endTime,
          })),
        });
      }

      return tx.court.update({
        where: { id },
        data: {
          name: dto.name,
          images,
          pricePerHour: dto.pricePerHour,
          isActive: dto.isActive,
        },
        include: { timeSlots: { orderBy: { startTime: 'asc' } } },
      });
    });
  }

  async remove(id: string, paddleOwnerId: number) {
    const court = await this.findOne(id);
    if (court.paddleOwnerId !== paddleOwnerId) {
      throw new ForbiddenException('You can only delete your own courts');
    }
    await this.prisma.court.delete({ where: { id } });
    return { message: 'Court deleted successfully' };
  }

  /** Available slots for a court on a given date */
  async getAvailability(courtId: string, dateStr: string) {
    const court = await this.findOne(courtId);
    const bookingDate = this.toDateOnly(dateStr);

    const bookings = await this.prisma.courtBooking.findMany({
      where: {
        courtId,
        bookingDate,
        status: { not: BookingStatus.CANCELLED },
      },
      select: { timeSlotId: true },
    });
    const bookedIds = new Set(bookings.map((b) => b.timeSlotId));

    return {
      courtId: court.id,
      date: dateStr,
      pricePerHour: court.pricePerHour,
      slots: court.timeSlots.map((slot) => ({
        ...slot,
        isBooked: bookedIds.has(slot.id),
      })),
    };
  }

  async createBooking(
    userId: number,
    courtId: string,
    dto: CreateCourtBookingDto,
  ) {
    const court = await this.findOne(courtId);
    if (!court.isActive) {
      throw new BadRequestException('Court is not available');
    }

    const timeSlot = court.timeSlots.find((s) => s.id === dto.timeSlotId);
    if (!timeSlot) {
      throw new BadRequestException('Time slot does not belong to this court');
    }

    const bookingDate = this.toDateOnly(dto.bookingDate);

    const existing = await this.prisma.courtBooking.findUnique({
      where: {
        timeSlotId_bookingDate: {
          timeSlotId: dto.timeSlotId,
          bookingDate,
        },
      },
    });
    if (existing && existing.status !== BookingStatus.CANCELLED) {
      throw new ConflictException('This slot is already booked for that date');
    }

    if (existing?.status === BookingStatus.CANCELLED) {
      return this.prisma.courtBooking.update({
        where: { id: existing.id },
        data: {
          userId,
          status: BookingStatus.PENDING,
          totalPrice: new Prisma.Decimal(court.pricePerHour),
          notes: dto.notes,
        },
        include: {
          timeSlot: true,
          court: true,
          user: {
            select: { id: true, fullName: true, mobileNumber: true },
          },
        },
      });
    }

    return this.prisma.courtBooking.create({
      data: {
        courtId,
        timeSlotId: dto.timeSlotId,
        userId,
        bookingDate,
        totalPrice: new Prisma.Decimal(court.pricePerHour),
        notes: dto.notes,
      },
      include: {
        timeSlot: true,
        court: true,
        user: {
          select: { id: true, fullName: true, mobileNumber: true },
        },
      },
    });
  }

  findMyBookings(userId: number) {
    return this.prisma.courtBooking.findMany({
      where: { userId },
      orderBy: [{ bookingDate: 'asc' }, { createdAt: 'desc' }],
      include: {
        timeSlot: true,
        court: {
          include: {
            paddleOwner: {
              select: {
                id: true,
                organizationName: true,
                location: true,
              },
            },
          },
        },
      },
    });
  }

  findOwnerBookings(paddleOwnerId: number) {
    return this.prisma.courtBooking.findMany({
      where: { court: { paddleOwnerId } },
      orderBy: [{ bookingDate: 'asc' }, { createdAt: 'desc' }],
      include: {
        timeSlot: true,
        court: true,
        user: {
          select: {
            id: true,
            fullName: true,
            mobileNumber: true,
          },
        },
      },
    });
  }

  async updateBookingStatus(
    bookingId: string,
    paddleOwnerId: number,
    dto: UpdateBookingStatusDto,
  ) {
    const booking = await this.prisma.courtBooking.findUnique({
      where: { id: bookingId },
      include: { court: true },
    });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    if (booking.court.paddleOwnerId !== paddleOwnerId) {
      throw new ForbiddenException('You can only manage bookings for your courts');
    }

    return this.prisma.courtBooking.update({
      where: { id: bookingId },
      data: { status: dto.status },
      include: {
        timeSlot: true,
        court: true,
        user: {
          select: {
            id: true,
            fullName: true,
            mobileNumber: true,
          },
        },
      },
    });
  }
}
