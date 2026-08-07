import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserGuard } from '../auth/user.guard';
import { StaffGuard } from '../auth/staff.guard';
import { CoachesService } from './coaches.service';
import { CreateCoachDto } from './dto/create-coach.dto';
import { UpdateCoachDto } from './dto/update-coach.dto';
import { CreateCoachReviewDto } from './dto/create-coach-review.dto';

@Controller('coaches')
export class CoachesController {
  constructor(private readonly coachesService: CoachesService) {}

  @UseGuards(JwtAuthGuard, StaffGuard)
  @Post()
  create(@Body() dto: CreateCoachDto) {
    return this.coachesService.create(dto);
  }

  @Get()
  findAll() {
    return this.coachesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.coachesService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, StaffGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCoachDto) {
    return this.coachesService.update(id, dto);
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
