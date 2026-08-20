import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StaffGuard } from '../auth/staff.guard';
import { RefereeGuard } from '../auth/referee.guard';
import { Roles } from '../auth/roles';
import { AccountCreatedBy } from '../../generated/prisma/client';
import { RefereesService } from './referees.service';
import { CreateRefereeDto } from './dto/create-referee.dto';
import { UpdateRefereeDto } from './dto/update-referee.dto';
import { RefereeLoginDto } from './dto/referee-login.dto';

const profileUpload = FileInterceptor('profileImage', {
  storage: memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

@Controller('referees')
export class RefereesController {
  constructor(private readonly refereesService: RefereesService) {}

  @Post('register')
  register(@Body() dto: CreateRefereeDto) {
    return this.refereesService.create(dto);
  }

  @Post('login')
  login(@Body() dto: RefereeLoginDto) {
    return this.refereesService.login(dto);
  }

  @UseGuards(JwtAuthGuard, RefereeGuard)
  @Get('me')
  me(@Req() req: { user: { userId: string } }) {
    return this.refereesService.me(String(req.user.userId));
  }

  @UseGuards(JwtAuthGuard, RefereeGuard)
  @Patch('me')
  @UseInterceptors(profileUpload)
  updateMe(
    @Req() req: { user: { userId: string } },
    @Body() dto: UpdateRefereeDto,
    @UploadedFile() profileImage?: Express.Multer.File,
  ) {
    return this.refereesService.update(
      String(req.user.userId),
      dto,
      profileImage,
    );
  }

  @Get()
  findAll() {
    return this.refereesService.findAll();
  }

  @UseGuards(JwtAuthGuard, StaffGuard)
  @Post()
  @UseInterceptors(profileUpload)
  create(
    @Req() req: { user: { userId: number; role?: string } },
    @Body() dto: CreateRefereeDto,
    @UploadedFile() profileImage?: Express.Multer.File,
  ) {
    const paddleOwnerId =
      req.user?.role === Roles.PADDLE_OWNER ? req.user.userId : undefined;
    return this.refereesService.create(
      dto,
      profileImage,
      paddleOwnerId,
      AccountCreatedBy.ADMIN,
    );
  }

  @UseGuards(JwtAuthGuard, StaffGuard)
  @Patch(':id')
  @UseInterceptors(profileUpload)
  update(
    @Param('id') id: string,
    @Req() req: { user: { userId: number; role?: string } },
    @Body() dto: UpdateRefereeDto,
    @UploadedFile() profileImage?: Express.Multer.File,
  ) {
    const paddleOwnerId =
      req.user?.role === Roles.PADDLE_OWNER ? req.user.userId : undefined;
    return this.refereesService.update(id, dto, profileImage, paddleOwnerId);
  }

  @UseGuards(JwtAuthGuard, StaffGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.refereesService.remove(id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.refereesService.findOne(id);
  }
}
