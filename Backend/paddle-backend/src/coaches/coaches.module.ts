import { Module } from '@nestjs/common';
import { ImageUploadService } from '../common/image-upload.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CoachesController } from './coaches.controller';
import { CoachesService } from './coaches.service';

@Module({
  imports: [PrismaModule],
  controllers: [CoachesController],
  providers: [CoachesService, ImageUploadService],
})
export class CoachesModule {}
