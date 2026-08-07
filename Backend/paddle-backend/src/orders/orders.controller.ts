import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserGuard } from '../auth/user.guard';
import { PaddleOwnerGuard } from '../auth/paddle-owner.guard';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @UseGuards(JwtAuthGuard, UserGuard)
  @Post()
  create(
    @Req() req: { user: { userId: number } },
    @Body() dto: CreateOrderDto,
  ) {
    return this.ordersService.create(req.user.userId, dto);
  }

  @UseGuards(JwtAuthGuard, UserGuard)
  @Get('my')
  findMyOrders(@Req() req: { user: { userId: number } }) {
    return this.ordersService.findMyOrders(req.user.userId);
  }

  @UseGuards(JwtAuthGuard, PaddleOwnerGuard)
  @Get('store')
  findOwnerOrders(@Req() req: { user: { userId: number } }) {
    return this.ordersService.findOwnerOrders(req.user.userId);
  }

  @UseGuards(JwtAuthGuard, PaddleOwnerGuard)
  @Get('store/:id')
  findOneForOwner(
    @Param('id') id: string,
    @Req() req: { user: { userId: number } },
  ) {
    return this.ordersService.findOneForOwner(id, req.user.userId);
  }

  @UseGuards(JwtAuthGuard, PaddleOwnerGuard)
  @Patch('store/:id/status')
  updateStatus(
    @Param('id') id: string,
    @Req() req: { user: { userId: number } },
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(id, req.user.userId, dto);
  }
}
