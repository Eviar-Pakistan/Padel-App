import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { Roles } from '../auth/roles';
import { AdminLoginDto } from './dto/admin-login.dto';
import { CreateOrganizationDto } from './dto/create-organization.dto';

@Injectable()
export class SuperAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: AdminLoginDto) {
    const admin = await this.prisma.superAdmin.findUnique({
      where: { username: dto.username },
    });

    if (!admin || !admin.isAdmin) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const ok = await bcrypt.compare(dto.password, admin.password);
    if (!ok) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const access_token = await this.jwtService.signAsync({
      sub: admin.id,
      username: admin.username,
      role: Roles.SUPER_ADMIN,
      isAdmin: admin.isAdmin,
    });

    return { access_token };
  }

  async listOrganizations() {
    const owners = await this.prisma.paddleOwner.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        organizationName: true,
        username: true,
        location: true,
        number: true,
        createdAt: true,
      },
    });

    return {
      total: owners.length,
      organizations: owners,
    };
  }

  async createOrganization(dto: CreateOrganizationDto) {
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
      select: {
        id: true,
        organizationName: true,
        username: true,
        location: true,
        number: true,
        createdAt: true,
      },
    });

    return {
      message: 'Organization created successfully',
      organization: owner,
    };
  }
}
