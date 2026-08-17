import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { ImageUploadService } from '../common/image-upload.service';
import { PrismaService } from '../prisma/prisma.service';
import { ChangePasswordDto, UpdateProfileDto } from './dto/profile.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly imageUpload: ImageUploadService,
  ) {}

  findAll() {
    return this.prisma.user.findMany({
      select: this.publicSelect(),
    });
  }

  async getProfile(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        ...this.publicSelect(),
        createdAt: true,
        updatedAt: true,
        coachReviews: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: {
            coach: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                profileImage: true,
              },
            },
          },
        },
        _count: {
          select: {
            newsPosts: true,
            newsLikes: true,
            newsSaves: true,
            newsComments: true,
            newsCommentLikes: true,
            coachReviews: true,
            orders: true,
            courtBookings: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { _count, ...profile } = user;
    return {
      ...profile,
      activity: {
        newsPosts: _count.newsPosts,
        newsLikes: _count.newsLikes,
        newsSaves: _count.newsSaves,
        newsComments: _count.newsComments,
        newsCommentLikes: _count.newsCommentLikes,
        coachReviews: _count.coachReviews,
        orders: _count.orders,
        courtBookings: _count.courtBookings,
      },
    };
  }

  async updateProfile(userId: number, dto: UpdateProfileDto) {
    if (dto.mobileNumber || dto.cnicNumber) {
      const conflict = await this.prisma.user.findFirst({
        where: {
          AND: [
            { NOT: { id: userId } },
            {
              OR: [
                ...(dto.mobileNumber
                  ? [{ mobileNumber: dto.mobileNumber.trim() }]
                  : []),
                ...(dto.cnicNumber
                  ? [{ cnicNumber: dto.cnicNumber.trim() }]
                  : []),
              ],
            },
          ],
        },
      });
      if (conflict) {
        throw new ConflictException('Mobile or CNIC already in use');
      }
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        fullName: dto.fullName?.trim(),
        mobileNumber: dto.mobileNumber?.trim(),
        cnicNumber: dto.cnicNumber?.trim(),
        handedness: dto.handedness?.trim() || undefined,
        location: dto.location?.trim() || undefined,
        province:
          dto.province !== undefined
            ? dto.province.trim() || null
            : undefined,
        isProfilePublic: dto.isProfilePublic,
      },
    });

    return this.getProfile(userId);
  }

  async updateProfileImage(userId: number, file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Profile image is required');
    }
    const profileImage = await this.imageUpload.saveProfileImage(file);
    await this.prisma.user.update({
      where: { id: userId },
      data: { profileImage },
    });
    return this.getProfile(userId);
  }

  async changePassword(userId: number, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const ok = await bcrypt.compare(dto.currentPassword, user.password);
    if (!ok) {
      throw new BadRequestException('Current password is incorrect');
    }

    const hash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hash },
    });

    return { message: 'Password updated successfully' };
  }

  private publicSelect() {
    return {
      id: true,
      fullName: true,
      mobileNumber: true,
      cnicNumber: true,
      profileImage: true,
      handedness: true,
      skillLevel: true,
      location: true,
      province: true,
      isProfilePublic: true,
      rank: true,
      points: true,
      wins: true,
    };
  }
}
