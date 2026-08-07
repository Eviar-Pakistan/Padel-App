import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaddleOwnerGuard } from '../auth/paddle-owner.guard';
import { PaddleOwnerService } from './paddle-owner.service';
import { RegisterPaddleOwnerDto } from './dto/register-paddle-owner.dto';
import { LoginPaddleOwnerDto } from './dto/login-paddle-owner.dto';

@Controller('paddle-owner')
export class PaddleOwnerController {
  constructor(private readonly paddleOwnerService: PaddleOwnerService) {}

  @Post('register')
  register(@Body() dto: RegisterPaddleOwnerDto) {
    return this.paddleOwnerService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginPaddleOwnerDto) {
    return this.paddleOwnerService.login(dto);
  }

  @UseGuards(JwtAuthGuard, PaddleOwnerGuard)
  @Get('me')
  me(@Req() req: { user: { userId: number; username?: string } }) {
    return {
      message: 'Paddle owner profile',
      owner: {
        id: req.user.userId,
        username: req.user.username,
      },
    };
  }

  @UseGuards(JwtAuthGuard, PaddleOwnerGuard)
  @Get('overview')
  overview(@Req() req: { user: { userId: number } }) {
    return this.paddleOwnerService.getOverview(req.user.userId);
  }
}
