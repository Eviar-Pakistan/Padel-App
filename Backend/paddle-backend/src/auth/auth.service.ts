import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { Roles } from './roles';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [
          { mobileNumber: dto.mobileNumber },
          { cnicNumber: dto.cnicNumber },
        ],
      },
    });
    if (existing) {
      throw new ConflictException('Mobile or CNIC already registered');
    }

    const hash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        fullName: dto.fullName,
        mobileNumber: dto.mobileNumber,
        cnicNumber: dto.cnicNumber,
        password: hash,
      },
    });

    return this.signToken(user.id, user.mobileNumber);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { mobileNumber: dto.mobileNumber },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const ok = await bcrypt.compare(dto.password, user.password);
    if (!ok) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.signToken(user.id, user.mobileNumber);
  }

  private async signToken(userId: number, mobile: string) {
    const access_token = await this.jwtService.signAsync({
      sub: userId,
      mobile,
      role: Roles.USER,
    });
    return { access_token };
  }
}
