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
import { PaddleOwnerGuard } from '../auth/paddle-owner.guard';
import { UserGuard } from '../auth/user.guard';
import { UserOrOwnerGuard } from '../auth/user-or-owner.guard';
import { ChatService } from './chat.service';
import { CreateChatGroupDto } from './dto/create-chat-group.dto';
import { SendChatMessageDto } from './dto/send-chat-message.dto';

const groupImageUpload = FileInterceptor('image', {
  storage: memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

const chatFileUpload = FileInterceptor('file', {
  storage: memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @UseGuards(JwtAuthGuard, PaddleOwnerGuard)
  @Post('groups')
  @UseInterceptors(groupImageUpload)
  createGroup(
    @Req() req: { user: { userId: number } },
    @Body() dto: CreateChatGroupDto,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    return this.chatService.createGroup(req.user.userId, dto, image);
  }

  @UseGuards(JwtAuthGuard, PaddleOwnerGuard)
  @Get('groups/mine')
  findMine(@Req() req: { user: { userId: number } }) {
    return this.chatService.findMine(req.user.userId);
  }

  @UseGuards(JwtAuthGuard, UserGuard)
  @Get('groups')
  findAllForUser(@Req() req: { user: { userId: number } }) {
    return this.chatService.findAllForUser(req.user.userId);
  }

  @UseGuards(JwtAuthGuard, UserOrOwnerGuard)
  @Get('groups/:id')
  findOne(
    @Param('id') id: string,
    @Req() req: { user: { userId: number; role?: string } },
  ) {
    return this.chatService.findOne(id, req.user);
  }

  @UseGuards(JwtAuthGuard, UserGuard)
  @Post('groups/:id/join')
  requestJoin(
    @Param('id') id: string,
    @Req() req: { user: { userId: number } },
  ) {
    return this.chatService.requestJoin(req.user.userId, id);
  }

  @UseGuards(JwtAuthGuard, PaddleOwnerGuard)
  @Get('groups/:id/requests')
  listRequests(
    @Param('id') id: string,
    @Req() req: { user: { userId: number } },
  ) {
    return this.chatService.listRequests(req.user.userId, id);
  }

  @UseGuards(JwtAuthGuard, PaddleOwnerGuard)
  @Post('groups/:id/requests/:requestId/accept')
  acceptRequest(
    @Param('id') id: string,
    @Param('requestId') requestId: string,
    @Req() req: { user: { userId: number } },
  ) {
    return this.chatService.acceptRequest(req.user.userId, id, requestId);
  }

  @UseGuards(JwtAuthGuard, PaddleOwnerGuard)
  @Post('groups/:id/requests/:requestId/reject')
  rejectRequest(
    @Param('id') id: string,
    @Param('requestId') requestId: string,
    @Req() req: { user: { userId: number } },
  ) {
    return this.chatService.rejectRequest(req.user.userId, id, requestId);
  }

  @UseGuards(JwtAuthGuard, UserOrOwnerGuard)
  @Get('groups/:id/messages')
  listMessages(
    @Param('id') id: string,
    @Req() req: { user: { userId: number; role?: string } },
    @Query('after') after?: string,
  ) {
    return this.chatService.listMessages(req.user, id, after);
  }

  @UseGuards(JwtAuthGuard, UserOrOwnerGuard)
  @Post('groups/:id/messages')
  @UseInterceptors(chatFileUpload)
  sendMessage(
    @Param('id') id: string,
    @Req() req: { user: { userId: number; role?: string } },
    @Body() dto: SendChatMessageDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.chatService.sendMessage(req.user, id, dto, file);
  }
}
