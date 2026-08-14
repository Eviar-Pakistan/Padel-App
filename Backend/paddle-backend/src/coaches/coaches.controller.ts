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
import { UserGuard } from '../auth/user.guard';
import { StaffGuard } from '../auth/staff.guard';
import { PaddleOwnerGuard } from '../auth/paddle-owner.guard';
import { Roles } from '../auth/roles';
import { CoachesService } from './coaches.service';
import { CreateCoachDto } from './dto/create-coach.dto';
import { UpdateCoachDto } from './dto/update-coach.dto';
import { CreateCoachReviewDto } from './dto/create-coach-review.dto';
import { CreateCoachBookingDto } from './dto/create-coach-booking.dto';
import { UpdateCoachBookingStatusDto } from './dto/update-coach-booking-status.dto';

const profileUpload = FileInterceptor('profileImage', {
  storage: memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

@Controller('coaches')
export class CoachesController {
  constructor(private readonly coachesService: CoachesService) {}

  @UseGuards(JwtAuthGuard, StaffGuard)
  @Post()
  @UseInterceptors(profileUpload)
  create(
    @Req() req: { user: { userId: number; role?: string } },
    @Body() dto: CreateCoachDto,
    @UploadedFile() profileImage?: Express.Multer.File,
  ) {
    const paddleOwnerId =
      req.user?.role === Roles.PADDLE_OWNER ? req.user.userId : undefined;
    return this.coachesService.create(dto, profileImage, paddleOwnerId);
  }

  @Get()
  findAll() {
    return this.coachesService.findAll();
  }

  @UseGuards(JwtAuthGuard, UserGuard)
  @Get('bookings/my')
  findMyBookings(@Req() req: { user: { userId: number } }) {
    return this.coachesService.findMyBookings(req.user.userId);
  }

  @UseGuards(JwtAuthGuard, PaddleOwnerGuard)
  @Get('bookings/store')
  findOwnerBookings(@Req() req: { user: { userId: number } }) {
    return this.coachesService.findOwnerBookings(req.user.userId);
  }

  @UseGuards(JwtAuthGuard, PaddleOwnerGuard)
  @Patch('bookings/:bookingId/status')
  updateBookingStatus(
    @Param('bookingId') bookingId: string,
    @Req() req: { user: { userId: number } },
    @Body() dto: UpdateCoachBookingStatusDto,
  ) {
    return this.coachesService.updateBookingStatus(
      bookingId,
      req.user.userId,
      dto,
    );
  }

  @UseGuards(JwtAuthGuard, PaddleOwnerGuard)
  @Delete('bookings/:bookingId')
  removeBooking(
    @Param('bookingId') bookingId: string,
    @Req() req: { user: { userId: number } },
  ) {
    return this.coachesService.removeBooking(bookingId, req.user.userId);
  }

  @UseGuards(JwtAuthGuard, UserGuard)
  @Post(':id/bookings')
  createBooking(
    @Param('id') id: string,
    @Req() req: { user: { userId: number } },
    @Body() dto: CreateCoachBookingDto,
  ) {
    return this.coachesService.createBooking(req.user.userId, id, dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.coachesService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, StaffGuard)
  @Patch(':id')
  @UseInterceptors(profileUpload)
  update(
    @Param('id') id: string,
    @Req() req: { user: { userId: number; role?: string } },
    @Body() dto: UpdateCoachDto,
    @UploadedFile() profileImage?: Express.Multer.File,
  ) {
    const paddleOwnerId =
      req.user?.role === Roles.PADDLE_OWNER ? req.user.userId : undefined;
    return this.coachesService.update(id, dto, profileImage, paddleOwnerId);
  }

  @UseGuards(JwtAuthGuard, StaffGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.coachesService.remove(id);
  }

  @Get(':id/reviews')
  getReviews(@Param('id') id: string) {
    return this.coachesService.getReviews(id);
  }

  @UseGuards(JwtAuthGuard, UserGuard)
  @Post(':id/reviews')
  addReview(
    @Param('id') id: string,
    @Req() req: { user: { userId: number } },
    @Body() dto: CreateCoachReviewDto,
  ) {
    return this.coachesService.addReview(id, req.user.userId, dto);
  }
}
