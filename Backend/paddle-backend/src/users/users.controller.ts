import {
  Body,
  Controller,
  Get,
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
import { UserGuard } from '../auth/user.guard';
import { ChangePasswordDto, UpdateProfileDto } from './dto/profile.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard, UserGuard)
  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @UseGuards(JwtAuthGuard, UserGuard)
  @Get('me')
  getProfile(@Req() req: { user: { userId: number } }) {
    return this.usersService.getProfile(req.user.userId);
  }

  @UseGuards(JwtAuthGuard, UserGuard)
  @Patch('me')
  updateProfile(
    @Req() req: { user: { userId: number } },
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(req.user.userId, dto);
  }

  @UseGuards(JwtAuthGuard, UserGuard)
  @Post('me/avatar')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  updateAvatar(
    @Req() req: { user: { userId: number } },
    @UploadedFile() image?: Express.Multer.File,
  ) {
    return this.usersService.updateProfileImage(req.user.userId, image);
  }

  @UseGuards(JwtAuthGuard, UserGuard)
  @Post('me/password')
  changePassword(
    @Req() req: { user: { userId: number } },
    @Body() dto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(req.user.userId, dto);
  }
}
