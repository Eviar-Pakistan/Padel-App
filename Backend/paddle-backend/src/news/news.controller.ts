import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { UserGuard } from '../auth/user.guard';
import { UserOrOwnerGuard } from '../auth/user-or-owner.guard';
import {
  CreateNewsCommentDto,
  CreateNewsPostDto,
  UpdateNewsPostDto,
} from './dto/news.dto';
import { NewsService } from './news.service';

const imagesUpload = FilesInterceptor('images', 8, {
  storage: memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

type AuthedRequest = {
  user?: { userId: number; role?: string } | null;
};

@Controller('news')
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  @Get('meta/filters')
  getFilters() {
    return this.newsService.getFilters();
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  findFeed(
    @Req() req: AuthedRequest,
    @Query('category') category?: string,
    @Query('location') location?: string,
    @Query('q') q?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.newsService.findFeed({
      category,
      location,
      q,
      cursor,
      limit: limit ? Number(limit) : undefined,
      viewer: req.user ?? null,
    });
  }

  @UseGuards(JwtAuthGuard, UserOrOwnerGuard)
  @Get('mine')
  findMine(@Req() req: AuthedRequest) {
    return this.newsService.findMine(req.user!);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.newsService.findOne(id, req.user ?? null);
  }

  @UseGuards(JwtAuthGuard, UserOrOwnerGuard)
  @Post()
  @UseInterceptors(imagesUpload)
  create(
    @Req() req: AuthedRequest,
    @Body() dto: CreateNewsPostDto,
    @UploadedFiles() images?: Express.Multer.File[],
  ) {
    return this.newsService.create(req.user!, dto, images ?? []);
  }

  @UseGuards(JwtAuthGuard, UserOrOwnerGuard)
  @Patch(':id')
  @UseInterceptors(imagesUpload)
  update(
    @Param('id') id: string,
    @Req() req: AuthedRequest,
    @Body() dto: UpdateNewsPostDto,
    @UploadedFiles() images?: Express.Multer.File[],
  ) {
    return this.newsService.update(id, req.user!, dto, images ?? []);
  }

  @UseGuards(JwtAuthGuard, UserOrOwnerGuard)
  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.newsService.remove(id, req.user!);
  }

  @UseGuards(JwtAuthGuard, UserGuard)
  @Post(':id/like')
  like(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.newsService.like(id, req.user!.userId);
  }

  @UseGuards(JwtAuthGuard, UserGuard)
  @Delete(':id/like')
  unlike(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.newsService.unlike(id, req.user!.userId);
  }

  @UseGuards(JwtAuthGuard, UserGuard)
  @Post(':id/save')
  save(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.newsService.save(id, req.user!.userId);
  }

  @UseGuards(JwtAuthGuard, UserGuard)
  @Delete(':id/save')
  unsave(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.newsService.unsave(id, req.user!.userId);
  }

  @UseGuards(JwtAuthGuard, UserGuard)
  @Post(':id/share')
  share(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.newsService.share(id, req.user!.userId);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get(':id/comments')
  listComments(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.newsService.listComments(id, req.user ?? null);
  }

  @UseGuards(JwtAuthGuard, UserGuard)
  @Post(':id/comments')
  addComment(
    @Param('id') id: string,
    @Req() req: AuthedRequest,
    @Body() dto: CreateNewsCommentDto,
  ) {
    return this.newsService.addComment(id, req.user!.userId, dto);
  }

  @UseGuards(JwtAuthGuard, UserGuard)
  @Delete('comments/:commentId')
  deleteComment(
    @Param('commentId') commentId: string,
    @Req() req: AuthedRequest,
  ) {
    return this.newsService.deleteComment(commentId, req.user!.userId);
  }

  @UseGuards(JwtAuthGuard, UserGuard)
  @Post('comments/:commentId/like')
  likeComment(
    @Param('commentId') commentId: string,
    @Req() req: AuthedRequest,
  ) {
    return this.newsService.likeComment(commentId, req.user!.userId);
  }

  @UseGuards(JwtAuthGuard, UserGuard)
  @Delete('comments/:commentId/like')
  unlikeComment(
    @Param('commentId') commentId: string,
    @Req() req: AuthedRequest,
  ) {
    return this.newsService.unlikeComment(commentId, req.user!.userId);
  }
}
