import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ImageUploadService } from '../common/image-upload.service';
import { CourtsController } from './courts.controller';
import { CourtsService } from './courts.service';

@Module({
  imports: [PrismaModule],
  controllers: [CourtsController],
  providers: [CourtsService, ImageUploadService],
})
export class CourtsModule {}
