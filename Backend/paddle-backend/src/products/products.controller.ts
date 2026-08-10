import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaddleOwnerGuard } from '../auth/paddle-owner.guard';
import { CatalogService } from './catalog.service';
import {
  CreateProductBrandDto,
  CreateProductCategoryDto,
  UpdateProductBrandDto,
  UpdateProductCategoryDto,
} from './dto/catalog.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

const imagesUpload = FilesInterceptor('images', 8, {
  storage: memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

@Controller()
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly catalogService: CatalogService,
  ) {}

  // ---- Categories ----
  @UseGuards(JwtAuthGuard, PaddleOwnerGuard)
  @Get('product-categories')
  listCategories(@Req() req: { user: { userId: number } }) {
    return this.catalogService.listCategories(req.user.userId);
  }

  @UseGuards(JwtAuthGuard, PaddleOwnerGuard)
  @Post('product-categories')
  createCategory(
    @Req() req: { user: { userId: number } },
    @Body() dto: CreateProductCategoryDto,
  ) {
    return this.catalogService.createCategory(req.user.userId, dto);
  }

  @UseGuards(JwtAuthGuard, PaddleOwnerGuard)
  @Patch('product-categories/:id')
  updateCategory(
    @Param('id') id: string,
    @Req() req: { user: { userId: number } },
    @Body() dto: UpdateProductCategoryDto,
  ) {
    return this.catalogService.updateCategory(id, req.user.userId, dto);
  }

  @UseGuards(JwtAuthGuard, PaddleOwnerGuard)
  @Delete('product-categories/:id')
  deleteCategory(
    @Param('id') id: string,
    @Req() req: { user: { userId: number } },
  ) {
    return this.catalogService.deleteCategory(id, req.user.userId);
  }

  // ---- Brands ----
  @UseGuards(JwtAuthGuard, PaddleOwnerGuard)
  @Get('product-brands')
  listBrands(@Req() req: { user: { userId: number } }) {
    return this.catalogService.listBrands(req.user.userId);
  }

  @UseGuards(JwtAuthGuard, PaddleOwnerGuard)
  @Post('product-brands')
  createBrand(
    @Req() req: { user: { userId: number } },
    @Body() dto: CreateProductBrandDto,
  ) {
    return this.catalogService.createBrand(req.user.userId, dto);
  }

  @UseGuards(JwtAuthGuard, PaddleOwnerGuard)
  @Patch('product-brands/:id')
  updateBrand(
    @Param('id') id: string,
    @Req() req: { user: { userId: number } },
    @Body() dto: UpdateProductBrandDto,
  ) {
    return this.catalogService.updateBrand(id, req.user.userId, dto);
  }

  @UseGuards(JwtAuthGuard, PaddleOwnerGuard)
  @Delete('product-brands/:id')
  deleteBrand(
    @Param('id') id: string,
    @Req() req: { user: { userId: number } },
  ) {
    return this.catalogService.deleteBrand(id, req.user.userId);
  }

  // ---- Products ----
  @UseGuards(JwtAuthGuard, PaddleOwnerGuard)
  @Post('products')
  @UseInterceptors(imagesUpload)
  create(
    @Req() req: { user: { userId: number } },
    @Body() dto: CreateProductDto,
    @UploadedFiles() images?: Express.Multer.File[],
  ) {
    return this.productsService.create(req.user.userId, dto, images ?? []);
  }

  @Get('products')
  findAll() {
    return this.productsService.findAll();
  }

  @UseGuards(JwtAuthGuard, PaddleOwnerGuard)
  @Get('products/mine')
  findMine(@Req() req: { user: { userId: number } }) {
    return this.productsService.findMine(req.user.userId);
  }

  @Get('products/:id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, PaddleOwnerGuard)
  @Patch('products/:id')
  @UseInterceptors(imagesUpload)
  update(
    @Param('id') id: string,
    @Req() req: { user: { userId: number } },
    @Body() dto: UpdateProductDto,
    @UploadedFiles() images?: Express.Multer.File[],
  ) {
    return this.productsService.update(id, req.user.userId, dto, images ?? []);
  }

  @UseGuards(JwtAuthGuard, PaddleOwnerGuard)
  @Delete('products/:id')
  remove(
    @Param('id') id: string,
    @Req() req: { user: { userId: number } },
  ) {
    return this.productsService.remove(id, req.user.userId);
  }
}
