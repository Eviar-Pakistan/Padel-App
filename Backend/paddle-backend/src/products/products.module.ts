import { Module } from '@nestjs/common';
import { ImageUploadService } from '../common/image-upload.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CatalogService } from './catalog.service';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  imports: [PrismaModule],
  controllers: [ProductsController],
  providers: [ProductsService, CatalogService, ImageUploadService],
})
export class ProductsModule {}
