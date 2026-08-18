import { JwtModule } from '@nestjs/jwt';
import { Module } from '@nestjs/common';
import { ChatMediaService } from '../chat/chat-media.service';
import { PrismaModule } from '../prisma/prisma.module';
import { MatchLiveGateway } from './match-live.gateway';
import {
  MatchesController,
  RefereeMatchesController,
} from './matches.controller';
import { MatchesService } from './matches.service';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
    }),
  ],
  controllers: [MatchesController, RefereeMatchesController],
  providers: [MatchesService, ChatMediaService, MatchLiveGateway],
})
export class MatchesModule {}
