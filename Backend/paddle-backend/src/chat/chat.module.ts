import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ImageUploadService } from '../common/image-upload.service';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatMediaService } from './chat-media.service';

@Module({
  imports: [PrismaModule],
  controllers: [ChatController],
  providers: [ChatService, ChatMediaService, ImageUploadService],
})
export class ChatModule {}
