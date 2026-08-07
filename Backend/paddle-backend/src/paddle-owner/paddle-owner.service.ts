import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { Roles } from '../auth/roles';
import { RegisterPaddleOwnerDto } from './dto/register-paddle-owner.dto';
import { LoginPaddleOwnerDto } from './dto/login-paddle-owner.dto';

@Injectable()
export class PaddleOwnerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterPaddleOwnerDto) {
    const existing = await this.prisma.paddleOwner.findUnique({
      where: { username: dto.username },
    });
    if (existing) {
      throw new ConflictException('Username already registered');
    }

    const hash = await bcrypt.hash(dto.password, 10);
    const owner = await this.prisma.paddleOwner.create({
      data: {
        organizationName: dto.organizationName,
        username: dto.username,
        location: dto.location,
        number: dto.number,
        password: hash,
      },
    });

    return this.signToken(owner.id, owner.username);
  }

  async login(dto: LoginPaddleOwnerDto) {
    const owner = await this.prisma.paddleOwner.findUnique({
      where: { username: dto.username },
    });
    if (!owner) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const ok = await bcrypt.compare(dto.password, owner.password);
    if (!ok) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.signToken(owner.id, owner.username);
  }

  async getOverview(paddleOwnerId: number) {
    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);
    const endOfToday = new Date(startOfToday);
    endOfToday.setUTCDate(endOfToday.getUTCDate() + 1);

    const [
      totalCourts,
      todayBookings,
      totalBookings,
      totalCoaches,
      totalProducts,
      totalOrders,
      recentBookings,
    ] = await Promise.all([
      this.prisma.court.count({ where: { paddleOwnerId } }),
      this.prisma.courtBooking.count({
        where: {
          court: { paddleOwnerId },
          bookingDate: { gte: startOfToday, lt: endOfToday },
          status: { not: 'CANCELLED' },
        },
      }),
      this.prisma.courtBooking.count({
        where: { court: { paddleOwnerId } },
      }),
      this.prisma.coach.count(),
      this.prisma.product.count({ where: { paddleOwnerId } }),
      this.prisma.order.count({ where: { paddleOwnerId } }),
      this.prisma.courtBooking.findMany({
        where: { court: { paddleOwnerId } },
        orderBy: [{ bookingDate: 'desc' }, { createdAt: 'desc' }],
        take: 8,
        include: {
          user: { select: { id: true, fullName: true, mobileNumber: true } },
          court: { select: { id: true, name: true } },
          timeSlot: true,
        },
      }),
    ]);

    return {
      totalCourts,
      todayBookings,
      totalBookings,
      totalCoaches,
      totalProducts,
      totalOrders,
      recentBookings,
    };
  }

  private async signToken(ownerId: number, username: string) {
    const access_token = await this.jwtService.signAsync({
      sub: ownerId,
      username,
      role: Roles.PADDLE_OWNER,
    });
    return { access_token };
  }
}
