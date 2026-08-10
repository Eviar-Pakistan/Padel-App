import { Module } from '@nestjs/common';
import { ImageUploadService } from '../common/image-upload.service';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [PrismaModule],
  providers: [UsersService, ImageUploadService],
  controllers: [UsersController],
})
export class UsersModule {}
