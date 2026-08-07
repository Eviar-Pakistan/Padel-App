import { Module } from '@nestjs/common';
import { ImageUploadService } from '../common/image-upload.service';
import { PrismaModule } from '../prisma/prisma.module';
import { NewsController } from './news.controller';
import { NewsService } from './news.service';

@Module({
  imports: [PrismaModule],
  controllers: [NewsController],
  providers: [NewsService, ImageUploadService],
})
export class NewsModule {}
