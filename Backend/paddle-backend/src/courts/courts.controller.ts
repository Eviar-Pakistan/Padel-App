import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaddleOwnerGuard } from '../auth/paddle-owner.guard';
import { UserGuard } from '../auth/user.guard';
import { CourtsService } from './courts.service';
import { CreateCourtDto } from './dto/create-court.dto';
import { UpdateCourtDto } from './dto/update-court.dto';
import { CreateCourtBookingDto } from './dto/create-court-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';

const imagesUpload = FilesInterceptor('images', 8, {
  storage: memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

@Controller('courts')
export class CourtsController {
  constructor(private readonly courtsService: CourtsService) {}

  @UseGuards(JwtAuthGuard, PaddleOwnerGuard)
  @Post()
  @UseInterceptors(imagesUpload)
  create(
    @Req() req: { user: { userId: number } },
    @Body() dto: CreateCourtDto,
    @UploadedFiles() images?: Express.Multer.File[],
  ) {
    return this.courtsService.create(req.user.userId, dto, images ?? []);
  }

  @Get()
  findAll() {
    return this.courtsService.findAll();
  }

  @UseGuards(JwtAuthGuard, PaddleOwnerGuard)
  @Get('mine')
  findMine(@Req() req: { user: { userId: number } }) {
    return this.courtsService.findMine(req.user.userId);
  }

  @UseGuards(JwtAuthGuard, UserGuard)
  @Get('bookings/my')
  findMyBookings(@Req() req: { user: { userId: number } }) {
    return this.courtsService.findMyBookings(req.user.userId);
  }

  @UseGuards(JwtAuthGuard, PaddleOwnerGuard)
  @Get('bookings/store')
  findOwnerBookings(@Req() req: { user: { userId: number } }) {
    return this.courtsService.findOwnerBookings(req.user.userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.courtsService.findOne(id);
  }

  @Get(':id/availability')
  getAvailability(@Param('id') id: string, @Query('date') date: string) {
    if (!date) {
      return this.courtsService.getAvailability(
        id,
        new Date().toISOString().slice(0, 10),
      );
    }
    return this.courtsService.getAvailability(id, date);
  }

  @UseGuards(JwtAuthGuard, PaddleOwnerGuard)
  @Patch(':id')
  @UseInterceptors(imagesUpload)
  update(
    @Param('id') id: string,
    @Req() req: { user: { userId: number } },
    @Body() dto: UpdateCourtDto,
    @UploadedFiles() images?: Express.Multer.File[],
  ) {
    return this.courtsService.update(id, req.user.userId, dto, images ?? []);
  }

  @UseGuards(JwtAuthGuard, PaddleOwnerGuard)
  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Req() req: { user: { userId: number } },
  ) {
    return this.courtsService.remove(id, req.user.userId);
  }

  @UseGuards(JwtAuthGuard, UserGuard)
  @Post(':id/bookings')
  createBooking(
    @Param('id') id: string,
    @Req() req: { user: { userId: number } },
    @Body() dto: CreateCourtBookingDto,
  ) {
    return this.courtsService.createBooking(req.user.userId, id, dto);
  }

  @UseGuards(JwtAuthGuard, PaddleOwnerGuard)
  @Patch('bookings/:bookingId/status')
  updateBookingStatus(
    @Param('bookingId') bookingId: string,
    @Req() req: { user: { userId: number } },
    @Body() dto: UpdateBookingStatusDto,
  ) {
    return this.courtsService.updateBookingStatus(
      bookingId,
      req.user.userId,
      dto,
    );
  }
}
