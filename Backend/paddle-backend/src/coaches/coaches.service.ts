import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCoachDto } from './dto/create-coach.dto';
import { UpdateCoachDto } from './dto/update-coach.dto';
import { CreateCoachReviewDto } from './dto/create-coach-review.dto';

@Injectable()
export class CoachesService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateCoachDto) {
    return this.prisma.coach.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        profileImage: dto.profileImage,
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
        isVerified: dto.isVerified ?? false,
        status: dto.status,
      },
    });
  }

  findAll() {
    return this.prisma.coach.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        reviews: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async findOne(id: string) {
    const coach = await this.prisma.coach.findUnique({
      where: { id },
      include: {
        reviews: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!coach) {
      throw new NotFoundException('Coach not found');
    }
    return coach;
  }

  async update(id: string, dto: UpdateCoachDto) {
    await this.findOne(id);

    return this.prisma.coach.update({
      where: { id },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        profileImage: dto.profileImage,
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
