import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BookingStatus,
  ChatMessageType,
  JoinRequestStatus,
  Prisma,
} from '../../generated/prisma/client';
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

  private normalizeHhmm(hhmm: string): string {
    const raw = String(hhmm || '').trim();
    const match = raw.match(/^(\d{1,2}):(\d{2})/);
    if (!match) return raw;
    const h = Number(match[1]);
    const m = Number(match[2]);
    if (Number.isNaN(h) || Number.isNaN(m) || h > 23 || m > 59) return raw;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  private timeToMinutes(hhmm: string): number {
    const normalized = this.normalizeHhmm(hhmm);
    const [hStr, mStr = '0'] = normalized.split(':');
    const h = Number(hStr);
    const m = Number(mStr);
    if (Number.isNaN(h) || Number.isNaN(m)) return NaN;
    return h * 60 + m;
  }

  private assertValidSlots(
    slots: { startTime: string; endTime: string }[],
  ) {
    const seen = new Set<string>();
    for (const slot of slots) {
      if (!slot.startTime || !slot.endTime) {
        throw new BadRequestException(
          'Each time slot must include startTime and endTime (HH:mm)',
        );
      }
      const startTime = this.normalizeHhmm(slot.startTime);
      const endTime = this.normalizeHhmm(slot.endTime);
      slot.startTime = startTime;
      slot.endTime = endTime;

      const key = `${startTime}|${endTime}`;
      if (seen.has(key)) {
        throw new BadRequestException(
          `Duplicate time slot ${startTime}-${endTime}`,
        );
      }
      seen.add(key);

      const startMins = this.timeToMinutes(startTime);
      let endMins = this.timeToMinutes(endTime);
      if (Number.isNaN(startMins) || Number.isNaN(endMins)) {
        throw new BadRequestException(
          `Invalid slot ${startTime}-${endTime}: use HH:mm (24h)`,
        );
      }
      // 23:00-00:00 ends at midnight; 00:00-01:00 is a normal next-day hour
      if (endTime === '00:00' && startTime !== '00:00') {
        endMins = 24 * 60;
      }
      if (startMins >= endMins) {
        throw new BadRequestException(
          `Invalid slot ${startTime}-${endTime}: start must be before end`,
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
        environmentType: dto.environmentType,
        address: dto.address?.trim() || null,
        latitude: dto.latitude,
        longitude: dto.longitude,
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
        // Create one-by-one so SQLite unique checks see deletes in this transaction
        for (const slot of dto.timeSlots) {
          await tx.courtTimeSlot.create({
            data: {
              courtId: id,
              startTime: slot.startTime,
              endTime: slot.endTime,
            },
          });
        }
      }

      return tx.court.update({
        where: { id },
        data: {
          name: dto.name,
          images,
          pricePerHour: dto.pricePerHour,
          environmentType: dto.environmentType,
          address:
            dto.address === undefined
              ? undefined
              : dto.address.trim() || null,
          latitude: dto.latitude,
          longitude: dto.longitude,
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

  private readonly bookingDetailInclude = {
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
    user: {
      select: {
        id: true,
        fullName: true,
        mobileNumber: true,
        profileImage: true,
      },
    },
    participants: {
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            profileImage: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' as const },
    },
  };

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

    const isPublic = Boolean(dto.isPublic);
    let availableSlots = 0;
    if (isPublic) {
      if (dto.availableSlots == null) {
        throw new BadRequestException(
          'availableSlots is required when booking is public (1–3 open spots)',
        );
      }
      availableSlots = dto.availableSlots;
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

    const bookingData = {
      userId,
      status: BookingStatus.PENDING,
      totalPrice: new Prisma.Decimal(court.pricePerHour),
      notes: dto.notes,
      isPublic,
      availableSlots,
    };

    if (existing?.status === BookingStatus.CANCELLED) {
      await this.prisma.courtBookingParticipant.deleteMany({
        where: { bookingId: existing.id },
      });
      return this.prisma.courtBooking.update({
        where: { id: existing.id },
        data: bookingData,
        include: this.bookingDetailInclude,
      });
    }

    return this.prisma.courtBooking.create({
      data: {
        courtId,
        timeSlotId: dto.timeSlotId,
        bookingDate,
        ...bookingData,
      },
      include: this.bookingDetailInclude,
    });
  }

  findJoinableBookings(params: {
    date: string;
    courtId?: string;
    paddleOwnerId?: number;
    excludeUserId?: number;
  }) {
    const bookingDate = this.toDateOnly(params.date);
    return this.prisma.courtBooking.findMany({
      where: {
        bookingDate,
        isPublic: true,
        availableSlots: { gt: 0 },
        status: { not: BookingStatus.CANCELLED },
        ...(params.courtId ? { courtId: params.courtId } : {}),
        ...(params.paddleOwnerId
          ? { court: { paddleOwnerId: params.paddleOwnerId } }
          : {}),
        ...(params.excludeUserId
          ? {
              userId: { not: params.excludeUserId },
              participants: {
                none: { userId: params.excludeUserId },
              },
              joinRequests: {
                none: {
                  requesterId: params.excludeUserId,
                  status: JoinRequestStatus.PENDING,
                },
              },
            }
          : {}),
      },
      orderBy: [{ bookingDate: 'asc' }, { createdAt: 'asc' }],
      include: this.bookingDetailInclude,
    });
  }

  async requestJoinBooking(requesterId: number, bookingId: string) {
    const booking = await this.prisma.courtBooking.findUnique({
      where: { id: bookingId },
      include: {
        participants: true,
        court: true,
        timeSlot: true,
        user: { select: { id: true, fullName: true } },
        joinRequests: {
          where: { requesterId },
        },
      },
    });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    if (booking.status === BookingStatus.CANCELLED) {
      throw new BadRequestException('This booking is cancelled');
    }
    if (!booking.isPublic) {
      throw new BadRequestException('This booking is not open to join');
    }
    if (booking.availableSlots <= 0) {
      throw new BadRequestException('No open spots left on this booking');
    }
    if (booking.userId === requesterId) {
      throw new BadRequestException('You already own this booking');
    }
    if (booking.participants.some((p) => p.userId === requesterId)) {
      throw new ConflictException('You already joined this booking');
    }

    const existing = booking.joinRequests[0];
    if (existing?.status === JoinRequestStatus.PENDING) {
      throw new ConflictException('You already requested to join this slot');
    }
    if (existing?.status === JoinRequestStatus.ACCEPTED) {
      throw new ConflictException('You already joined this booking');
    }

    const requester = await this.prisma.user.findUnique({
      where: { id: requesterId },
      select: { id: true, fullName: true },
    });
    const requesterName = requester?.fullName || 'A player';
    const courtName = booking.court?.name || 'court';
    const dateStr = booking.bookingDate.toISOString().slice(0, 10);
    const slotLabel = booking.timeSlot?.startTime || '';

    const joinRequest = existing
      ? await this.prisma.courtBookingJoinRequest.update({
          where: { id: existing.id },
          data: { status: JoinRequestStatus.PENDING },
        })
      : await this.prisma.courtBookingJoinRequest.create({
          data: {
            bookingId,
            requesterId,
            status: JoinRequestStatus.PENDING,
          },
        });

    await this.prisma.notification.create({
      data: {
        receiverId: booking.userId,
        senderId: requesterId,
        type: 'Court Slot Join',
        message: `${requesterName} wants to join your ${courtName} slot${slotLabel ? ` at ${slotLabel}` : ''} on ${dateStr}.`,
        meta: {
          action: 'ACCEPT_JOIN',
          joinRequestId: joinRequest.id,
          bookingId,
        },
      },
    });

    return {
      message: 'Join request sent. Waiting for the booking owner to accept.',
      joinRequest,
    };
  }

  async acceptJoinRequest(ownerUserId: number, joinRequestId: string) {
    const request = await this.prisma.courtBookingJoinRequest.findUnique({
      where: { id: joinRequestId },
      include: {
        booking: {
          include: {
            participants: true,
            court: true,
            timeSlot: true,
          },
        },
        requester: {
          select: { id: true, fullName: true },
        },
      },
    });
    if (!request) {
      throw new NotFoundException('Join request not found');
    }
    if (request.booking.userId !== ownerUserId) {
      throw new ForbiddenException('Only the booking owner can accept this request');
    }
    if (request.status !== JoinRequestStatus.PENDING) {
      throw new BadRequestException('This join request is no longer pending');
    }
    if (request.booking.status === BookingStatus.CANCELLED) {
      throw new BadRequestException('This booking is cancelled');
    }
    if (!request.booking.isPublic || request.booking.availableSlots <= 0) {
      throw new BadRequestException('No open spots left on this booking');
    }
    if (request.booking.participants.some((p) => p.userId === request.requesterId)) {
      await this.prisma.courtBookingJoinRequest.update({
        where: { id: joinRequestId },
        data: { status: JoinRequestStatus.ACCEPTED },
      });
      throw new ConflictException('This player already joined the booking');
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        const updated = await tx.courtBooking.updateMany({
          where: {
            id: request.bookingId,
            isPublic: true,
            availableSlots: { gt: 0 },
            status: { not: BookingStatus.CANCELLED },
          },
          data: {
            availableSlots: { decrement: 1 },
          },
        });
        if (updated.count === 0) {
          throw new ConflictException('No open spots left on this booking');
        }
        await tx.courtBookingParticipant.create({
          data: {
            bookingId: request.bookingId,
            userId: request.requesterId,
          },
        });
        await tx.courtBookingJoinRequest.update({
          where: { id: joinRequestId },
          data: { status: JoinRequestStatus.ACCEPTED },
        });

        await this.ensureCourtBookingChatGroup(tx, {
          bookingId: request.bookingId,
          ownerUserId,
          joinerUserId: request.requesterId,
          joinerName: request.requester?.fullName || 'A player',
          courtName: request.booking.court?.name || 'court',
          paddleOwnerId: request.booking.court?.paddleOwnerId,
          bookingDate: request.booking.bookingDate,
          startTime: request.booking.timeSlot?.startTime || '',
        });
      });
    } catch (err) {
      if (
        err instanceof ConflictException ||
        err instanceof BadRequestException
      ) {
        throw err;
      }
      throw new ConflictException('Unable to accept this join request');
    }

    const courtName = request.booking.court?.name || 'court';
    const dateStr = request.booking.bookingDate.toISOString().slice(0, 10);
    const slotLabel = request.booking.timeSlot?.startTime || '';

    await this.prisma.notification.create({
      data: {
        receiverId: request.requesterId,
        senderId: ownerUserId,
        type: 'Court Slot Join',
        message: `Your request to join ${courtName}${slotLabel ? ` at ${slotLabel}` : ''} on ${dateStr} has been accepted.`,
        meta: {
          action: 'JOIN_ACCEPTED',
          bookingId: request.bookingId,
          joinRequestId,
        },
      },
    });

    // Clear accept action on related owner notifications for this request
    const ownerNotifs = await this.prisma.notification.findMany({
      where: {
        receiverId: ownerUserId,
        type: 'Court Slot Join',
      },
    });
    for (const n of ownerNotifs) {
      const meta = n.meta as { action?: string; joinRequestId?: string } | null;
      if (meta?.action === 'ACCEPT_JOIN' && meta?.joinRequestId === joinRequestId) {
        await this.prisma.notification.update({
          where: { id: n.id },
          data: {
            isRead: true,
            meta: {
              ...meta,
              action: 'JOIN_ACCEPTED',
              resolved: true,
            },
          },
        });
      }
    }

    return this.prisma.courtBooking.findUnique({
      where: { id: request.bookingId },
      include: this.bookingDetailInclude,
    });
  }

  /**
   * On first accepted join: create a "Court Booking" chat group with owner + joiner.
   * Later accepts: add the joiner to the existing group.
   */
  private async ensureCourtBookingChatGroup(
    tx: Prisma.TransactionClient,
    params: {
      bookingId: string;
      ownerUserId: number;
      joinerUserId: number;
      joinerName: string;
      courtName: string;
      paddleOwnerId?: number | null;
      bookingDate: Date;
      startTime: string;
    },
  ) {
    const {
      bookingId,
      ownerUserId,
      joinerUserId,
      joinerName,
      courtName,
      paddleOwnerId,
      bookingDate,
      startTime,
    } = params;
    if (paddleOwnerId == null) {
      return;
    }

    const booking = await tx.courtBooking.findUnique({
      where: { id: bookingId },
      select: { chatGroupId: true },
    });
    if (!booking) return;

    if (booking.chatGroupId) {
      await tx.chatGroupMember.upsert({
        where: {
          groupId_userId: {
            groupId: booking.chatGroupId,
            userId: joinerUserId,
          },
        },
        create: { groupId: booking.chatGroupId, userId: joinerUserId },
        update: {},
      });
      await tx.chatMessage.create({
        data: {
          groupId: booking.chatGroupId,
          senderUserId: joinerUserId,
          type: ChatMessageType.TEXT,
          text: `${joinerName} joined the court booking.`,
        },
      });
      await tx.chatGroup.update({
        where: { id: booking.chatGroupId },
        data: { updatedAt: new Date() },
      });
      return;
    }

    const dateStr = bookingDate.toISOString().slice(0, 10);
    const description = [courtName, dateStr, startTime]
      .filter(Boolean)
      .join(' · ');
    // Unique display name so bookings on the same court do not all say "Court Booking"
    const groupName = description || 'Court Booking';

    const group = await tx.chatGroup.create({
      data: {
        name: groupName,
        description: description || undefined,
        paddleOwnerId,
        members: {
          create: [
            { userId: ownerUserId },
            { userId: joinerUserId },
          ],
        },
        messages: {
          create: {
            senderUserId: ownerUserId,
            type: ChatMessageType.TEXT,
            text: 'Court Booking chat started. Players who join this booking will be added here.',
          },
        },
      },
    });

    const linked = await tx.courtBooking.updateMany({
      where: { id: bookingId, chatGroupId: null },
      data: { chatGroupId: group.id },
    });

    if (linked.count === 0) {
      // Another accept created the group first — use that one and drop the orphan.
      await tx.chatGroup.delete({ where: { id: group.id } });
      const fresh = await tx.courtBooking.findUnique({
        where: { id: bookingId },
        select: { chatGroupId: true },
      });
      if (fresh?.chatGroupId) {
        await tx.chatGroupMember.upsert({
          where: {
            groupId_userId: {
              groupId: fresh.chatGroupId,
              userId: joinerUserId,
            },
          },
          create: { groupId: fresh.chatGroupId, userId: joinerUserId },
          update: {},
        });
      }
    }
  }

  /** @deprecated Prefer requestJoinBooking + acceptJoinRequest */
  async joinBooking(userId: number, bookingId: string) {
    return this.requestJoinBooking(userId, bookingId);
  }

  findMyBookings(userId: number) {
    return this.prisma.courtBooking.findMany({
      where: {
        OR: [
          { userId },
          { participants: { some: { userId } } },
        ],
      },
      orderBy: [{ bookingDate: 'asc' }, { createdAt: 'desc' }],
      include: this.bookingDetailInclude,
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
            profileImage: true,
          },
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                profileImage: true,
              },
            },
          },
        },
      },
    });
  }

  private bookingStatusMessage(
    courtName: string,
    bookingDate: Date,
    status: BookingStatus,
  ): string {
    const dateStr = bookingDate.toISOString().slice(0, 10);
    const court = courtName || 'your court';
    switch (status) {
      case BookingStatus.PENDING:
        return `Your booking for ${court} on ${dateStr} is pending.`;
      case BookingStatus.CONFIRMED:
        return `Your booking for ${court} on ${dateStr} has been confirmed.`;
      case BookingStatus.CANCELLED:
        return `Your booking for ${court} on ${dateStr} has been cancelled.`;
      case BookingStatus.COMPLETED:
        return `Your booking for ${court} on ${dateStr} has been marked completed.`;
      default:
        return `Your booking for ${court} on ${dateStr} status was updated to ${status}.`;
    }
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

    const updated = await this.prisma.courtBooking.update({
      where: { id: bookingId },
      data: { status: dto.status },
      include: this.bookingDetailInclude,
    });

    if (booking.status !== dto.status) {
      await this.prisma.notification.create({
        data: {
          receiverId: booking.userId,
          senderId: paddleOwnerId,
          type: 'Booking Details',
          message: this.bookingStatusMessage(
            booking.court.name,
            booking.bookingDate,
            dto.status,
          ),
        },
      });
    }

    return updated;
  }

  async deleteBooking(bookingId: string, paddleOwnerId: number) {
    const booking = await this.prisma.courtBooking.findUnique({
      where: { id: bookingId },
      include: { court: true },
    });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    if (booking.court.paddleOwnerId !== paddleOwnerId) {
      throw new ForbiddenException('You can only delete bookings for your courts');
    }

    await this.prisma.courtBooking.delete({ where: { id: bookingId } });
    return { message: 'Booking deleted successfully' };
  }
}
