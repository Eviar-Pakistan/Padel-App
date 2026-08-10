import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProductStatus, Prisma } from '../../generated/prisma/client';
import { ImageUploadService } from '../common/image-upload.service';
import { slugify } from '../common/slugify';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

const productInclude = {
  category: true,
  brand: true,
  images: { orderBy: { sortOrder: 'asc' as const } },
  paddleOwner: {
    select: {
      id: true,
      organizationName: true,
      location: true,
    },
  },
};

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly imageUpload: ImageUploadService,
  ) {}

  async create(
    paddleOwnerId: number,
    dto: CreateProductDto,
    files: Express.Multer.File[] = [],
  ) {
    await this.assertCategory(paddleOwnerId, dto.categoryId);
    if (dto.brandId) {
      await this.assertBrand(paddleOwnerId, dto.brandId);
    }

    const stock = dto.stock ?? 0;
    const status =
      stock === 0 && dto.status !== ProductStatus.DRAFT
        ? ProductStatus.OUT_OF_STOCK
        : (dto.status ?? ProductStatus.ACTIVE);

    const slug = await this.uniqueProductSlug(
      paddleOwnerId,
      slugify(dto.slug || dto.name),
    );
    const urls = await this.imageUpload.saveProductImages(files);

    return this.prisma.product.create({
      data: {
        paddleOwnerId,
        categoryId: dto.categoryId,
        brandId: dto.brandId || null,
        name: dto.name.trim(),
        slug,
        description: dto.description?.trim(),
        shortDescription: dto.shortDescription?.trim(),
        sku: dto.sku?.trim(),
        price: dto.price,
        currency: dto.currency || 'PKR',
        specifications:
          dto.specifications === undefined
            ? undefined
            : (dto.specifications as Prisma.InputJsonValue),
        status,
        stock,
        weight: dto.weight,
        length: dto.length,
        width: dto.width,
        height: dto.height,
        images: {
          create: urls.map((url, index) => ({
            url,
            sortOrder: index,
          })),
        },
      },
      include: productInclude,
    });
  }

  findAll() {
    return this.prisma.product.findMany({
      where: { status: ProductStatus.ACTIVE },
      orderBy: { createdAt: 'desc' },
      include: productInclude,
    });
  }

  findMine(paddleOwnerId: number) {
    return this.prisma.product.findMany({
      where: { paddleOwnerId },
      orderBy: { createdAt: 'desc' },
      include: productInclude,
    });
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: productInclude,
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  async update(
    id: string,
    paddleOwnerId: number,
    dto: UpdateProductDto,
    files: Express.Multer.File[] = [],
  ) {
    const product = await this.findOne(id);
    if (product.paddleOwnerId !== paddleOwnerId) {
      throw new ForbiddenException('You can only update your own products');
    }

    if (dto.categoryId) {
      await this.assertCategory(paddleOwnerId, dto.categoryId);
    }
    if (dto.brandId) {
      await this.assertBrand(paddleOwnerId, dto.brandId);
    }

    const stock = dto.stock ?? product.stock;
    let status = dto.status ?? product.status;
    if (stock === 0 && status === ProductStatus.ACTIVE) {
      status = ProductStatus.OUT_OF_STOCK;
    } else if (stock > 0 && status === ProductStatus.OUT_OF_STOCK) {
      status = ProductStatus.ACTIVE;
    }

    const slug =
      dto.slug || dto.name
        ? await this.uniqueProductSlug(
            paddleOwnerId,
            slugify(dto.slug || dto.name || product.name),
            product.id,
          )
        : undefined;

    const uploaded = await this.imageUpload.saveProductImages(files);
    const keepIds = Array.isArray(dto.existingImageIds)
      ? dto.existingImageIds
      : product.images.map((img) => img.id);

    return this.prisma.$transaction(async (tx) => {
      await tx.productImage.deleteMany({
        where: {
          productId: id,
          id: { notIn: keepIds },
        },
      });

      const remaining = await tx.productImage.count({ where: { productId: id } });
      if (uploaded.length) {
        await tx.productImage.createMany({
          data: uploaded.map((url, index) => ({
            productId: id,
            url,
            sortOrder: remaining + index,
          })),
        });
      }

      return tx.product.update({
        where: { id },
        data: {
          name: dto.name?.trim(),
          slug,
          categoryId: dto.categoryId,
          brandId:
            dto.brandId === undefined
              ? undefined
              : dto.brandId
                ? dto.brandId
                : null,
          description: dto.description?.trim(),
          shortDescription: dto.shortDescription?.trim(),
          sku: dto.sku?.trim(),
          price: dto.price,
          currency: dto.currency,
          specifications:
            dto.specifications === undefined
              ? undefined
              : (dto.specifications as Prisma.InputJsonValue),
          status,
          stock: dto.stock,
          weight: dto.weight,
          length: dto.length,
          width: dto.width,
          height: dto.height,
        },
        include: productInclude,
      });
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

  private async assertCategory(paddleOwnerId: number, categoryId: string) {
    const category = await this.prisma.productCategory.findUnique({
      where: { id: categoryId },
    });
    if (!category || category.paddleOwnerId !== paddleOwnerId) {
      throw new BadRequestException('Invalid category for this owner');
    }
  }

  private async assertBrand(paddleOwnerId: number, brandId: string) {
    const brand = await this.prisma.productBrand.findUnique({
      where: { id: brandId },
    });
    if (!brand || brand.paddleOwnerId !== paddleOwnerId) {
      throw new BadRequestException('Invalid brand for this owner');
    }
  }

  private async uniqueProductSlug(
    paddleOwnerId: number,
    base: string,
    excludeId?: string,
  ) {
    let slug = base;
    let i = 2;
    while (true) {
      const existing = await this.prisma.product.findFirst({
        where: {
          paddleOwnerId,
          slug,
          ...(excludeId ? { NOT: { id: excludeId } } : {}),
        },
      });
      if (!existing) return slug;
      slug = `${base}-${i++}`;
    }
  }
}
