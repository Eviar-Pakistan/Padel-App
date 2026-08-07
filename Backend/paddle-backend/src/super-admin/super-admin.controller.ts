import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { SuperAdminService } from './super-admin.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { CreateOrganizationDto } from './dto/create-organization.dto';

@Controller('super-admin')
export class SuperAdminController {
  constructor(private readonly superAdminService: SuperAdminService) {}

  @Post('login')
  login(@Body() dto: AdminLoginDto) {
    return this.superAdminService.login(dto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('dashboard')
  getDashboard(@Req() req: { user: { userId: number; username?: string } }) {
    return {
      message: 'Welcome to the admin dashboard',
      admin: {
        id: req.user.userId,
        username: req.user.username,
      },
    };
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('organizations')
  listOrganizations() {
    return this.superAdminService.listOrganizations();
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('organizations')
  createOrganization(@Body() dto: CreateOrganizationDto) {
    return this.superAdminService.createOrganization(dto);
  }
}
