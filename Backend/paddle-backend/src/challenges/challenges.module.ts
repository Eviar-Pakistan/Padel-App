import { Module } from '@nestjs/common';
import { ChatMediaService } from '../chat/chat-media.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ChallengesController } from './challenges.controller';
import { ChallengesService } from './challenges.service';

@Module({
  imports: [PrismaModule],
  controllers: [ChallengesController],
  providers: [ChallengesService, ChatMediaService],
})
export class ChallengesModule {}
