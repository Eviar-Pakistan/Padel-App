import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { slugify } from '../common/slugify';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateProductBrandDto,
  CreateProductCategoryDto,
  UpdateProductBrandDto,
  UpdateProductCategoryDto,
} from './dto/catalog.dto';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  listCategories(paddleOwnerId: number) {
    return this.prisma.productCategory.findMany({
      where: { paddleOwnerId },
      orderBy: { name: 'asc' },
    });
  }

  async createCategory(paddleOwnerId: number, dto: CreateProductCategoryDto) {
    const slug = await this.uniqueCategorySlug(paddleOwnerId, slugify(dto.name));
    return this.prisma.productCategory.create({
      data: {
        paddleOwnerId,
        name: dto.name.trim(),
        slug,
        description: dto.description?.trim(),
      },
    });
  }

  async updateCategory(
    id: string,
    paddleOwnerId: number,
    dto: UpdateProductCategoryDto,
  ) {
    const category = await this.requireCategory(id, paddleOwnerId);
    const data: Prisma.ProductCategoryUpdateInput = {};
    if (dto.name !== undefined) {
      data.name = dto.name.trim();
      data.slug = await this.uniqueCategorySlug(
        paddleOwnerId,
        slugify(dto.name),
        category.id,
      );
    }
    if (dto.description !== undefined) {
      data.description = dto.description?.trim() || null;
    }
    return this.prisma.productCategory.update({ where: { id }, data });
  }

  async deleteCategory(id: string, paddleOwnerId: number) {
    await this.requireCategory(id, paddleOwnerId);
    const count = await this.prisma.product.count({ where: { categoryId: id } });
    if (count > 0) {
      throw new ConflictException(
        'Cannot delete a category that still has products',
      );
    }
    await this.prisma.productCategory.delete({ where: { id } });
    return { message: 'Category deleted' };
  }

  listBrands(paddleOwnerId: number) {
    return this.prisma.productBrand.findMany({
      where: { paddleOwnerId },
      orderBy: { name: 'asc' },
    });
  }

  async createBrand(paddleOwnerId: number, dto: CreateProductBrandDto) {
    const slug = await this.uniqueBrandSlug(paddleOwnerId, slugify(dto.name));
    return this.prisma.productBrand.create({
      data: {
        paddleOwnerId,
        name: dto.name.trim(),
        slug,
      },
    });
  }

  async updateBrand(
    id: string,
    paddleOwnerId: number,
    dto: UpdateProductBrandDto,
  ) {
    const brand = await this.requireBrand(id, paddleOwnerId);
    if (dto.name === undefined) return brand;
    return this.prisma.productBrand.update({
      where: { id },
      data: {
        name: dto.name.trim(),
        slug: await this.uniqueBrandSlug(
          paddleOwnerId,
          slugify(dto.name),
          brand.id,
        ),
      },
    });
  }

  async deleteBrand(id: string, paddleOwnerId: number) {
    await this.requireBrand(id, paddleOwnerId);
    await this.prisma.product.updateMany({
      where: { brandId: id },
      data: { brandId: null },
    });
    await this.prisma.productBrand.delete({ where: { id } });
    return { message: 'Brand deleted' };
  }

  private async requireCategory(id: string, paddleOwnerId: number) {
    const category = await this.prisma.productCategory.findUnique({
      where: { id },
    });
    if (!category) throw new NotFoundException('Category not found');
    if (category.paddleOwnerId !== paddleOwnerId) {
      throw new ForbiddenException('You can only manage your own categories');
    }
    return category;
  }

  private async requireBrand(id: string, paddleOwnerId: number) {
    const brand = await this.prisma.productBrand.findUnique({ where: { id } });
    if (!brand) throw new NotFoundException('Brand not found');
    if (brand.paddleOwnerId !== paddleOwnerId) {
      throw new ForbiddenException('You can only manage your own brands');
    }
    return brand;
  }

  private async uniqueCategorySlug(
    paddleOwnerId: number,
    base: string,
    excludeId?: string,
  ) {
    let slug = base;
    let i = 2;
    while (true) {
      const existing = await this.prisma.productCategory.findFirst({
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

  private async uniqueBrandSlug(
    paddleOwnerId: number,
    base: string,
    excludeId?: string,
  ) {
    let slug = base;
    let i = 2;
    while (true) {
      const existing = await this.prisma.productBrand.findFirst({
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
