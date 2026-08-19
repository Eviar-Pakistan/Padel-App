import {
  Body,
  Controller,
  Delete,
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
import { RefereeGuard } from '../auth/referee.guard';
import { SendChatMessageDto } from '../chat/dto/send-chat-message.dto';
import { MatchesService } from './matches.service';
import { MatchLiveGateway } from './match-live.gateway';
import { CreateMatchDto } from './dto/create-match.dto';
import { AssignRefereeDto } from './dto/assign-referee.dto';
import { SwitchMatchTeamsDto } from './dto/switch-match-teams.dto';
import { MatchScoreActionDto } from './dto/match-score-action.dto';

const chatFileUpload = FileInterceptor('file', {
  storage: memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

@Controller('matches')
export class MatchesController {
  constructor(private readonly matches: MatchesService) {}

  @UseGuards(JwtAuthGuard, UserGuard)
  @Get('players')
  listPlayers(@Req() req: { user: { userId: number } }) {
    return this.matches.listPlayers(req.user.userId);
  }

  @UseGuards(JwtAuthGuard, UserGuard)
  @Get('referees')
  listReferees(
    @Query('courtId') courtId: string,
    @Query('date') date: string,
    @Query('startTime') startTime: string,
  ) {
    return this.matches.listAvailableReferees(courtId, date, startTime);
  }

  @UseGuards(JwtAuthGuard, UserGuard)
  @Get('conversations')
  listConversations(@Req() req: { user: { userId: number } }) {
    return this.matches.listConversationsForUser(req.user.userId);
  }

  @UseGuards(JwtAuthGuard, UserGuard)
  @Get()
  list(@Req() req: { user: { userId: number } }) {
    return this.matches.listForUser(req.user.userId);
  }

  @UseGuards(JwtAuthGuard, UserGuard)
  @Get('calendar')
  listCalendar(@Req() req: { user: { userId: number } }) {
    return this.matches.listCalendarEvents(req.user.userId);
  }

  @UseGuards(JwtAuthGuard, UserGuard)
  @Get('live')
  listLive() {
    return this.matches.listLive();
  }

  @UseGuards(JwtAuthGuard, UserGuard)
  @Get('results')
  listResults() {
    return this.matches.listResults();
  }

  @UseGuards(JwtAuthGuard, UserGuard)
  @Get('history')
  listHistory(@Req() req: { user: { userId: number } }) {
    return this.matches.listHistoryForUser(req.user.userId);
  }

  @UseGuards(JwtAuthGuard, UserGuard)
  @Post()
  create(
    @Req() req: { user: { userId: number } },
    @Body() dto: CreateMatchDto,
  ) {
    return this.matches.create(req.user.userId, dto);
  }

  @UseGuards(JwtAuthGuard, UserGuard)
  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Req() req: { user: { userId: number } },
  ) {
    return this.matches.findOneForUser(req.user.userId, id);
  }

  @UseGuards(JwtAuthGuard, UserGuard)
  @Post(':id/remind')
  remind(
    @Param('id') id: string,
    @Req() req: { user: { userId: number } },
  ) {
    return this.matches.toggleWatch(req.user.userId, id, 'remind', true);
  }

  @UseGuards(JwtAuthGuard, UserGuard)
  @Delete(':id/remind')
  unremind(
    @Param('id') id: string,
    @Req() req: { user: { userId: number } },
  ) {
    return this.matches.toggleWatch(req.user.userId, id, 'remind', false);
  }

  @UseGuards(JwtAuthGuard, UserGuard)
  @Post(':id/calendar')
  addCalendar(
    @Param('id') id: string,
    @Req() req: { user: { userId: number } },
  ) {
    return this.matches.toggleWatch(req.user.userId, id, 'onCalendar', true);
  }

  @UseGuards(JwtAuthGuard, UserGuard)
  @Delete(':id/calendar')
  removeCalendar(
    @Param('id') id: string,
    @Req() req: { user: { userId: number } },
  ) {
    return this.matches.toggleWatch(req.user.userId, id, 'onCalendar', false);
  }

  @UseGuards(JwtAuthGuard, UserGuard)
  @Post(':id/accept')
  accept(
    @Param('id') id: string,
    @Req() req: { user: { userId: number } },
  ) {
    return this.matches.acceptInvite(req.user.userId, id);
  }

  @UseGuards(JwtAuthGuard, UserGuard)
  @Post(':id/reject')
  reject(
    @Param('id') id: string,
    @Req() req: { user: { userId: number } },
  ) {
    return this.matches.rejectInvite(req.user.userId, id);
  }

  @UseGuards(JwtAuthGuard, UserGuard)
  @Post(':id/join')
  join(
    @Param('id') id: string,
    @Req() req: { user: { userId: number } },
  ) {
    return this.matches.requestJoin(req.user.userId, id);
  }

  @UseGuards(JwtAuthGuard, UserGuard)
  @Post(':id/join-requests/:requestId/accept')
  acceptJoin(
    @Param('id') id: string,
    @Param('requestId') requestId: string,
    @Req() req: { user: { userId: number } },
  ) {
    return this.matches.acceptJoin(req.user.userId, id, requestId);
  }

  @UseGuards(JwtAuthGuard, UserGuard)
  @Post(':id/teams')
  switchTeams(
    @Param('id') id: string,
    @Req() req: { user: { userId: number } },
    @Body() dto: SwitchMatchTeamsDto,
  ) {
    return this.matches.switchTeams(req.user.userId, id, dto);
  }

  @UseGuards(JwtAuthGuard, UserGuard)
  @Post(':id/referee')
  assignReferee(
    @Param('id') id: string,
    @Req() req: { user: { userId: number } },
    @Body() dto: AssignRefereeDto,
  ) {
    return this.matches.assignReferee(req.user.userId, id, dto.refereeId);
  }

  @UseGuards(JwtAuthGuard, UserGuard)
  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Req() req: { user: { userId: number } },
  ) {
    return this.matches.remove(req.user.userId, id);
  }

  @UseGuards(JwtAuthGuard, UserGuard)
  @Get(':id/messages')
  listMessages(
    @Param('id') id: string,
    @Req() req: { user: { userId: number } },
    @Query('after') after?: string,
  ) {
    return this.matches.listMessages(
      id,
      { kind: 'user', id: req.user.userId },
      after,
    );
  }

  @UseGuards(JwtAuthGuard, UserGuard)
  @Post(':id/messages')
  @UseInterceptors(chatFileUpload)
  sendMessage(
    @Param('id') id: string,
    @Req() req: { user: { userId: number } },
    @Body() dto: SendChatMessageDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.matches.sendMessage(
      id,
      { kind: 'user', id: req.user.userId },
      dto,
      file,
    );
  }
}

@Controller('referee-matches')
@UseGuards(JwtAuthGuard, RefereeGuard)
export class RefereeMatchesController {
  constructor(
    private readonly matches: MatchesService,
    private readonly live: MatchLiveGateway,
  ) {}

  @Get()
  list(@Req() req: { user: { userId: string } }) {
    return this.matches.listForReferee(String(req.user.userId));
  }

  @Get('conversations')
  conversations(@Req() req: { user: { userId: string } }) {
    return this.matches.listConversationsForReferee(String(req.user.userId));
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Req() req: { user: { userId: string } },
  ) {
    return this.matches.findOneForReferee(String(req.user.userId), id);
  }

  @Post(':id/score')
  async score(
    @Param('id') id: string,
    @Req() req: { user: { userId: string } },
    @Body() dto: MatchScoreActionDto,
  ) {
    const match = await this.matches.recordScore(
      String(req.user.userId),
      id,
      dto,
    );
    this.live.emitScore(id, match);
    if (match.score?.finished) this.live.emitFinished(id, match);
    return match;
  }

  @Post(':id/accept')
  accept(
    @Param('id') id: string,
    @Req() req: { user: { userId: string } },
  ) {
    return this.matches.refereeRespond(String(req.user.userId), id, true);
  }

  @Post(':id/reject')
  reject(
    @Param('id') id: string,
    @Req() req: { user: { userId: string } },
  ) {
    return this.matches.refereeRespond(String(req.user.userId), id, false);
  }

  @Get(':id/messages')
  listMessages(
    @Param('id') id: string,
    @Req() req: { user: { userId: string } },
    @Query('after') after?: string,
  ) {
    return this.matches.listMessages(
      id,
      { kind: 'referee', id: String(req.user.userId) },
      after,
    );
  }

  @Post(':id/messages')
  @UseInterceptors(chatFileUpload)
  sendMessage(
    @Param('id') id: string,
    @Req() req: { user: { userId: string } },
    @Body() dto: SendChatMessageDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.matches.sendMessage(
      id,
      { kind: 'referee', id: String(req.user.userId) },
      dto,
      file,
    );
  }
}
