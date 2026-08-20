import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Prisma, AccountCreatedBy } from '../../generated/prisma/client';
import { ImageUploadService } from '../common/image-upload.service';
import { PrismaService } from '../prisma/prisma.service';
import { Roles } from '../auth/roles';
import { CreateRefereeDto } from './dto/create-referee.dto';
import { UpdateRefereeDto } from './dto/update-referee.dto';
import { RefereeLoginDto } from './dto/referee-login.dto';

const courtSelect = {
  id: true,
  name: true,
  address: true,
  paddleOwner: {
    select: { id: true, organizationName: true, location: true },
  },
} as const;

@Injectable()
export class RefereesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly imageUpload: ImageUploadService,
    private readonly jwtService: JwtService,
  ) {}

  private sanitize<T extends { password?: string | null }>(referee: T) {
    const { password: _password, ...rest } = referee;
    return rest;
  }

  private readonly include = {
    courts: {
      include: { court: { select: courtSelect } },
    },
    paddleOwner: {
      select: { id: true, organizationName: true, location: true },
    },
  };

  async create(dto: CreateRefereeDto, file?: Express.Multer.File, paddleOwnerId?: number, createdBy: AccountCreatedBy = AccountCreatedBy.SELF) {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.referee.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const profileImage = await this.imageUpload.saveProfileImage(file);
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const courtIds = await this.validCourtIds(dto.courtIds);

    const referee = await this.prisma.referee.create({
      data: {
        fullName: dto.fullName?.trim() || '',
        email,
        phoneNumber: dto.phoneNumber?.trim() || '',
        password: passwordHash,
        profileImage,
        location: dto.location?.trim() || undefined,
        province: dto.province?.trim() || undefined,
        hourlyRate: dto.hourlyRate,
        availableFromDay: dto.availableFromDay,
        availableToDay: dto.availableToDay,
        availableFromTime: dto.availableFromTime,
        availableToTime: dto.availableToTime,
        status: dto.status,
        createdBy,
        ...(paddleOwnerId ? { paddleOwnerId } : {}),
        ...(courtIds.length
          ? { courts: { create: courtIds.map((courtId) => ({ courtId })) } }
          : {}),
      },
      include: this.include,
    });
    return this.sanitize(referee);
  }

  async login(dto: RefereeLoginDto) {
    const referee = await this.prisma.referee.findUnique({
      where: { email: dto.email.trim().toLowerCase() },
    });
    if (!referee?.password) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const ok = await bcrypt.compare(dto.password, referee.password);
    if (!ok) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (referee.status !== 'ACTIVE') {
      throw new UnauthorizedException('Referee account is not active');
    }
    const access_token = await this.jwtService.signAsync({
      sub: referee.id,
      email: referee.email,
      role: Roles.REFEREE,
    });
    return {
      access_token,
      referee: this.sanitize(referee),
    };
  }

  findAll() {
    return this.prisma.referee
      .findMany({
        orderBy: { createdAt: 'desc' },
        include: this.include,
      })
      .then((rows) => rows.map((r) => this.sanitize(r)));
  }

  async findOne(id: string) {
    const referee = await this.prisma.referee.findUnique({
      where: { id },
      include: this.include,
    });
    if (!referee) throw new NotFoundException('Referee not found');
    return this.sanitize(referee);
  }

  me(id: string) {
    return this.findOne(id);
  }

  async update(
    id: string,
    dto: UpdateRefereeDto,
    file?: Express.Multer.File,
    paddleOwnerId?: number,
  ) {
    const existing = await this.prisma.referee.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Referee not found');

    if (dto.email) {
      const email = dto.email.trim().toLowerCase();
      const clash = await this.prisma.referee.findFirst({
        where: { email, NOT: { id } },
      });
      if (clash) throw new ConflictException('Email already registered');
    }

    const profileImage = await this.imageUpload.saveProfileImage(file);
    const passwordHash = dto.password
      ? await bcrypt.hash(dto.password, 10)
      : undefined;

    const data: Prisma.RefereeUpdateInput = {
      fullName: dto.fullName?.trim(),
      phoneNumber: dto.phoneNumber?.trim(),
      ...(dto.email ? { email: dto.email.trim().toLowerCase() } : {}),
      ...(profileImage ? { profileImage } : {}),
      ...(passwordHash ? { password: passwordHash } : {}),
      ...(dto.location !== undefined ? { location: dto.location } : {}),
      ...(dto.province !== undefined ? { province: dto.province } : {}),
      ...(dto.hourlyRate !== undefined ? { hourlyRate: dto.hourlyRate } : {}),
      ...(dto.availableFromDay !== undefined
        ? { availableFromDay: dto.availableFromDay }
        : {}),
      ...(dto.availableToDay !== undefined
        ? { availableToDay: dto.availableToDay }
        : {}),
      ...(dto.availableFromTime !== undefined
        ? { availableFromTime: dto.availableFromTime }
        : {}),
      ...(dto.availableToTime !== undefined
        ? { availableToTime: dto.availableToTime }
        : {}),
      ...(dto.status ? { status: dto.status } : {}),
      ...(paddleOwnerId && !existing.paddleOwnerId
        ? { paddleOwner: { connect: { id: paddleOwnerId } } }
        : {}),
    };

    if (dto.courtIds !== undefined) {
      const courtIds = await this.validCourtIds(dto.courtIds);
      await this.prisma.$transaction([
        this.prisma.refereeCourt.deleteMany({ where: { refereeId: id } }),
        this.prisma.referee.update({ where: { id }, data }),
        ...(courtIds.length
          ? [
              this.prisma.refereeCourt.createMany({
                data: courtIds.map((courtId) => ({ refereeId: id, courtId })),
              }),
            ]
          : []),
      ]);
      return this.findOne(id);
    }

    await this.prisma.referee.update({ where: { id }, data });
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.referee.delete({ where: { id } });
    return { message: 'Referee deleted successfully' };
  }

  private async validCourtIds(ids?: string[]) {
    if (!ids?.length) return [] as string[];
    const unique = [...new Set(ids)];
    const courts = await this.prisma.court.findMany({
      where: { id: { in: unique } },
      select: { id: true },
    });
    return courts.map((c) => c.id);
  }
}
