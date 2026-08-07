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
import { PaddleOwnerGuard } from '../auth/paddle-owner.guard';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @UseGuards(JwtAuthGuard, PaddleOwnerGuard)
  @Post()
  create(
    @Req() req: { user: { userId: number } },
    @Body() dto: CreateProductDto,
  ) {
    return this.productsService.create(req.user.userId, dto);
  }

  @Get()
  findAll() {
    return this.productsService.findAll();
  }

  @UseGuards(JwtAuthGuard, PaddleOwnerGuard)
  @Get('mine')
  findMine(@Req() req: { user: { userId: number } }) {
    return this.productsService.findMine(req.user.userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, PaddleOwnerGuard)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Req() req: { user: { userId: number } },
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(id, req.user.userId, dto);
  }

  @UseGuards(JwtAuthGuard, PaddleOwnerGuard)
  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Req() req: { user: { userId: number } },
  ) {
    return this.productsService.remove(id, req.user.userId);
  }
}
