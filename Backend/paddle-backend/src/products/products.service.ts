import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductStatus } from '../../generated/prisma/client';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  create(paddleOwnerId: number, dto: CreateProductDto) {
    return this.prisma.product.create({
      data: {
        name: dto.name,
        description: dto.description,
        price: dto.price,
        image: dto.image,
        stock: dto.stock,
        category: dto.category,
        status:
          dto.stock === 0
            ? ProductStatus.OUT_OF_STOCK
            : (dto.status ?? ProductStatus.ACTIVE),
        paddleOwnerId,
      },
    });
  }

  findAll() {
    return this.prisma.product.findMany({
      where: { status: ProductStatus.ACTIVE },
      orderBy: { createdAt: 'desc' },
      include: {
        paddleOwner: {
          select: {
            id: true,
            organizationName: true,
            location: true,
          },
        },
      },
    });
  }

  findMine(paddleOwnerId: number) {
    return this.prisma.product.findMany({
      where: { paddleOwnerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        paddleOwner: {
          select: {
            id: true,
            organizationName: true,
            location: true,
          },
        },
      },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  async update(id: string, paddleOwnerId: number, dto: UpdateProductDto) {
    const product = await this.findOne(id);
    if (product.paddleOwnerId !== paddleOwnerId) {
      throw new ForbiddenException('You can only update your own products');
    }

    const stock = dto.stock ?? product.stock;
    return this.prisma.product.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        price: dto.price,
        image: dto.image,
        stock: dto.stock,
        category: dto.category,
        status:
          stock === 0
            ? ProductStatus.OUT_OF_STOCK
            : (dto.status ?? product.status),
      },
    });
  }

  async remove(id: string, paddleOwnerId: number) {
    const product = await this.findOne(id);
    if (product.paddleOwnerId !== paddleOwnerId) {
      throw new ForbiddenException('You can only delete your own products');
    }
    await this.prisma.product.delete({ where: { id } });
    return { message: 'Product deleted successfully' };
  }
}
