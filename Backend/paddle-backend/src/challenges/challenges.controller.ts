import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserGuard } from '../auth/user.guard';
import { SendChatMessageDto } from '../chat/dto/send-chat-message.dto';
import { ChallengesService } from './challenges.service';
import { CreateChallengeDto } from './dto/create-challenge.dto';

const chatFileUpload = FileInterceptor('file', {
  storage: memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

@Controller('challenges')
@UseGuards(JwtAuthGuard, UserGuard)
export class ChallengesController {
  constructor(private readonly challengesService: ChallengesService) {}

  @Get('players')
  listPlayers(@Req() req: { user: { userId: number } }) {
    return this.challengesService.listPlayers(req.user.userId);
  }

  @Get('mine')
  listMine(@Req() req: { user: { userId: number } }) {
    return this.challengesService.listMine(req.user.userId);
  }

  @Get('conversations')
  listConversations(@Req() req: { user: { userId: number } }) {
    return this.challengesService.listConversations(req.user.userId);
  }

  @Get('conversations/:id/messages')
  listMessages(
    @Param('id') id: string,
    @Req() req: { user: { userId: number } },
    @Query('after') after?: string,
  ) {
    return this.challengesService.listMessages(req.user.userId, id, after);
  }

  @Post('conversations/:id/messages')
  @UseInterceptors(chatFileUpload)
  sendMessage(
    @Param('id') id: string,
    @Req() req: { user: { userId: number } },
    @Body() dto: SendChatMessageDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.challengesService.sendMessage(req.user.userId, id, dto, file);
  }

  @Post()
  create(
    @Req() req: { user: { userId: number } },
    @Body() dto: CreateChallengeDto,
  ) {
    return this.challengesService.create(req.user.userId, dto.opponentId);
  }

  @Post(':id/accept')
  accept(
    @Param('id') id: string,
    @Req() req: { user: { userId: number } },
  ) {
    return this.challengesService.accept(req.user.userId, id);
  }
}
