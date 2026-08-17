import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ImageUploadService } from '../common/image-upload.service';
import { ChatMediaService } from '../chat/chat-media.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CoachesController } from './coaches.controller';
import { CoachesService } from './coaches.service';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [CoachesController],
  providers: [CoachesService, ImageUploadService, ChatMediaService],
})
export class CoachesModule {}
