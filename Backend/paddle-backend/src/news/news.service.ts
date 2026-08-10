import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  NewsAuthorType,
  NewsCategory,
  Prisma,
} from '../../generated/prisma/client';
import { Roles } from '../auth/roles';
import { ImageUploadService } from '../common/image-upload.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateNewsCommentDto,
  CreateNewsPostDto,
  UpdateNewsPostDto,
} from './dto/news.dto';

type AuthUser = {
  userId: number;
  role?: string;
};

@Injectable()
export class NewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly imageUpload: ImageUploadService,
  ) {}

  async getFilters() {
    const rows = await this.prisma.newsPost.findMany({
      distinct: ['location'],
      select: { location: true },
      orderBy: { location: 'asc' },
    });

    return {
      categories: Object.values(NewsCategory),
      locations: rows.map((r) => r.location).filter(Boolean),
    };
  }

  async findFeed(params: {
    category?: string;
    location?: string;
    q?: string;
    cursor?: string;
    limit?: number;
    viewer?: AuthUser | null;
  }) {
    const take = Math.min(Math.max(params.limit ?? 10, 1), 30);
    const where: Prisma.NewsPostWhereInput = {};

    if (params.category) {
      where.category = params.category as NewsCategory;
    }
    if (params.location) {
      where.location = { contains: params.location };
    }
    if (params.q?.trim()) {
      where.description = { contains: params.q.trim() };
    }

    let cursorFilter: Prisma.NewsPostWhereInput | undefined;
    if (params.cursor) {
      const cursorPost = await this.prisma.newsPost.findUnique({
        where: { id: params.cursor },
        select: { id: true, createdAt: true },
      });
      if (cursorPost) {
        cursorFilter = {
          OR: [
            { createdAt: { lt: cursorPost.createdAt } },
            {
              createdAt: cursorPost.createdAt,
              id: { lt: cursorPost.id },
            },
          ],
        };
      }
    }

    const posts = await this.prisma.newsPost.findMany({
      where: cursorFilter ? { AND: [where, cursorFilter] } : where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: take + 1,
    });

    const hasMore = posts.length > take;
    const page = hasMore ? posts.slice(0, take) : posts;
    const nextCursor = hasMore ? page[page.length - 1]?.id : null;

    const enriched = await this.enrichPosts(page, params.viewer);

    return { items: enriched, nextCursor };
  }

  async findMine(auth: AuthUser) {
    const where =
      auth.role === Roles.PADDLE_OWNER
        ? { paddleOwnerId: auth.userId, authorType: NewsAuthorType.PADDLE_OWNER }
        : { userId: auth.userId, authorType: NewsAuthorType.USER };

    const posts = await this.prisma.newsPost.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });

    return this.enrichPosts(posts, auth);
  }

  async findOne(id: string, viewer?: AuthUser | null) {
    const post = await this.prisma.newsPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundException('Post not found');
    const [enriched] = await this.enrichPosts([post], viewer);
    return enriched;
  }

  async create(
    auth: AuthUser,
    dto: CreateNewsPostDto,
    files: Express.Multer.File[] = [],
  ) {
    const images = await this.imageUpload.saveNewsImages(files);
    let authorName: string;
    let location: string;
    let authorType: NewsAuthorType;
    let userId: number | undefined;
    let paddleOwnerId: number | undefined;

    if (auth.role === Roles.PADDLE_OWNER) {
      const owner = await this.prisma.paddleOwner.findUnique({
        where: { id: auth.userId },
      });
      if (!owner) throw new NotFoundException('Owner not found');
      authorType = NewsAuthorType.PADDLE_OWNER;
      paddleOwnerId = owner.id;
      authorName = owner.organizationName;
      location = dto.location?.trim() || owner.location;
    } else if (auth.role === Roles.USER) {
      const user = await this.prisma.user.findUnique({
        where: { id: auth.userId },
      });
      if (!user) throw new NotFoundException('User not found');
      authorType = NewsAuthorType.USER;
      userId = user.id;
      authorName = user.fullName;
      location = dto.location?.trim() || user.location || 'Unknown';
    } else {
      throw new ForbiddenException('Users or paddle owners only');
    }

    const post = await this.prisma.newsPost.create({
      data: {
        authorType,
        userId,
        paddleOwnerId,
        authorName,
        location,
        description: dto.description.trim(),
        category: dto.category,
        images,
      },
    });

    return this.findOne(post.id, auth);
  }

  async update(
    id: string,
    auth: AuthUser,
    dto: UpdateNewsPostDto,
    files: Express.Multer.File[] = [],
  ) {
    const post = await this.requireAuthor(id, auth);
    const uploaded = await this.imageUpload.saveNewsImages(files);
    const kept =
      dto.existingImages ??
      (Array.isArray(post.images) ? (post.images as string[]) : []);
    const images = [...kept, ...uploaded];

    await this.prisma.newsPost.update({
      where: { id },
      data: {
        description: dto.description?.trim(),
        category: dto.category,
        location: dto.location?.trim(),
        images,
      },
    });

    return this.findOne(id, auth);
  }

  async remove(id: string, auth: AuthUser) {
    await this.requireAuthor(id, auth);
    await this.prisma.newsPost.delete({ where: { id } });
    return { ok: true };
  }

  async like(postId: string, userId: number) {
    await this.requirePost(postId);
    try {
      await this.prisma.$transaction([
        this.prisma.newsLike.create({ data: { postId, userId } }),
        this.prisma.newsPost.update({
          where: { id: postId },
          data: { likeCount: { increment: 1 } },
        }),
      ]);
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        return this.findOne(postId, { userId, role: Roles.USER });
      }
      throw err;
    }
    return this.findOne(postId, { userId, role: Roles.USER });
  }

  async unlike(postId: string, userId: number) {
    await this.requirePost(postId);
    const existing = await this.prisma.newsLike.findUnique({
      where: { postId_userId: { postId, userId } },
    });
    if (!existing) {
      return this.findOne(postId, { userId, role: Roles.USER });
    }
    await this.prisma.$transaction([
      this.prisma.newsLike.delete({ where: { id: existing.id } }),
      this.prisma.newsPost.update({
        where: { id: postId },
        data: { likeCount: { decrement: 1 } },
      }),
    ]);
    return this.findOne(postId, { userId, role: Roles.USER });
  }

  async save(postId: string, userId: number) {
    await this.requirePost(postId);
    try {
      await this.prisma.$transaction([
        this.prisma.newsSave.create({ data: { postId, userId } }),
        this.prisma.newsPost.update({
          where: { id: postId },
          data: { saveCount: { increment: 1 } },
        }),
      ]);
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        return this.findOne(postId, { userId, role: Roles.USER });
      }
      throw err;
    }
    return this.findOne(postId, { userId, role: Roles.USER });
  }

  async unsave(postId: string, userId: number) {
    await this.requirePost(postId);
    const existing = await this.prisma.newsSave.findUnique({
      where: { postId_userId: { postId, userId } },
    });
    if (!existing) {
      return this.findOne(postId, { userId, role: Roles.USER });
    }
    await this.prisma.$transaction([
      this.prisma.newsSave.delete({ where: { id: existing.id } }),
      this.prisma.newsPost.update({
        where: { id: postId },
        data: { saveCount: { decrement: 1 } },
      }),
    ]);
    return this.findOne(postId, { userId, role: Roles.USER });
  }

  async share(postId: string, userId: number) {
    await this.requirePost(postId);
    await this.prisma.newsPost.update({
      where: { id: postId },
      data: { shareCount: { increment: 1 } },
    });
    return this.findOne(postId, { userId, role: Roles.USER });
  }

  async listComments(postId: string, viewer?: AuthUser | null) {
    await this.requirePost(postId);
    const comments = await this.prisma.newsComment.findMany({
      where: { postId, parentId: null },
      orderBy: { createdAt: 'asc' },
      include: {
        user: { select: { id: true, fullName: true } },
        replies: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: { select: { id: true, fullName: true } },
          },
        },
      },
    });

    const allIds = comments.flatMap((c) => [
      c.id,
      ...c.replies.map((r) => r.id),
    ]);
    let likedIds = new Set<string>();
    if (viewer?.role === Roles.USER && allIds.length) {
      const likes = await this.prisma.newsCommentLike.findMany({
        where: { userId: viewer.userId, commentId: { in: allIds } },
        select: { commentId: true },
      });
      likedIds = new Set(likes.map((l) => l.commentId));
    }

    const mapComment = (
      c: (typeof comments)[number] | (typeof comments)[number]['replies'][number],
    ) => ({
      id: c.id,
      postId: c.postId,
      userId: c.userId,
      parentId: c.parentId,
      body: c.body,
      likeCount: c.likeCount,
      createdAt: c.createdAt,
      authorName: c.user.fullName,
      likedByMe: likedIds.has(c.id),
      isMine: viewer?.role === Roles.USER && viewer.userId === c.userId,
    });

    return comments.map((c) => ({
      ...mapComment(c),
      replies: c.replies.map(mapComment),
    }));
  }

  async addComment(postId: string, userId: number, dto: CreateNewsCommentDto) {
    await this.requirePost(postId);
    if (dto.parentId) {
      const parent = await this.prisma.newsComment.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent || parent.postId !== postId) {
        throw new BadRequestException('Invalid parent comment');
      }
      if (parent.parentId) {
        throw new BadRequestException('Only one reply level is allowed');
      }
    }

    const comment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.newsComment.create({
        data: {
          postId,
          userId,
          parentId: dto.parentId || null,
          body: dto.body.trim(),
        },
        include: { user: { select: { id: true, fullName: true } } },
      });
      await tx.newsPost.update({
        where: { id: postId },
        data: { commentCount: { increment: 1 } },
      });
      return created;
    });

    return {
      id: comment.id,
      postId: comment.postId,
      userId: comment.userId,
      parentId: comment.parentId,
      body: comment.body,
      likeCount: comment.likeCount,
      createdAt: comment.createdAt,
      authorName: comment.user.fullName,
      likedByMe: false,
      isMine: true,
      replies: [],
    };
  }

  async deleteComment(commentId: string, userId: number) {
    const comment = await this.prisma.newsComment.findUnique({
      where: { id: commentId },
      include: { replies: { select: { id: true } } },
    });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.userId !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    const removeCount = 1 + comment.replies.length;
    await this.prisma.$transaction([
      this.prisma.newsComment.delete({ where: { id: commentId } }),
      this.prisma.newsPost.update({
        where: { id: comment.postId },
        data: { commentCount: { decrement: removeCount } },
      }),
    ]);
    return { ok: true };
  }

  async likeComment(commentId: string, userId: number) {
    const comment = await this.prisma.newsComment.findUnique({
      where: { id: commentId },
    });
    if (!comment) throw new NotFoundException('Comment not found');
    try {
      await this.prisma.$transaction([
        this.prisma.newsCommentLike.create({ data: { commentId, userId } }),
        this.prisma.newsComment.update({
          where: { id: commentId },
          data: { likeCount: { increment: 1 } },
        }),
      ]);
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        return { ok: true, liked: true };
      }
      throw err;
    }
    return { ok: true, liked: true };
  }

  async unlikeComment(commentId: string, userId: number) {
    const existing = await this.prisma.newsCommentLike.findUnique({
      where: { commentId_userId: { commentId, userId } },
    });
    if (!existing) return { ok: true, liked: false };
    await this.prisma.$transaction([
      this.prisma.newsCommentLike.delete({ where: { id: existing.id } }),
      this.prisma.newsComment.update({
        where: { id: commentId },
        data: { likeCount: { decrement: 1 } },
      }),
    ]);
    return { ok: true, liked: false };
  }

  private async requirePost(id: string) {
    const post = await this.prisma.newsPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundException('Post not found');
    return post;
  }

  private async requireAuthor(id: string, auth: AuthUser) {
    const post = await this.requirePost(id);
    const isUserAuthor =
      auth.role === Roles.USER &&
      post.authorType === NewsAuthorType.USER &&
      post.userId === auth.userId;
    const isOwnerAuthor =
      auth.role === Roles.PADDLE_OWNER &&
      post.authorType === NewsAuthorType.PADDLE_OWNER &&
      post.paddleOwnerId === auth.userId;

    if (!isUserAuthor && !isOwnerAuthor) {
      throw new ForbiddenException('You can only modify your own posts');
    }
    return post;
  }

  private async enrichPosts(
    posts: Array<{
      id: string;
      authorType: NewsAuthorType;
      userId: number | null;
      paddleOwnerId: number | null;
      authorName: string;
      location: string;
      description: string;
      category: NewsCategory;
      images: Prisma.JsonValue;
      likeCount: number;
      commentCount: number;
      saveCount: number;
      shareCount: number;
      createdAt: Date;
      updatedAt: Date;
    }>,
    viewer?: AuthUser | null,
  ) {
    if (!posts.length) return [];

    const ids = posts.map((p) => p.id);
    const authorUserIds = [
      ...new Set(
        posts
          .filter((p) => p.authorType === NewsAuthorType.USER && p.userId)
          .map((p) => p.userId as number),
      ),
    ];

    let liked = new Set<string>();
    let saved = new Set<string>();
    const avatarByUserId = new Map<number, string | null>();

    const avatarPromise =
      authorUserIds.length > 0
        ? this.prisma.user.findMany({
            where: { id: { in: authorUserIds } },
            select: { id: true, profileImage: true },
          })
        : Promise.resolve([]);

    if (viewer?.role === Roles.USER) {
      const [likes, saves, authors] = await Promise.all([
        this.prisma.newsLike.findMany({
          where: { userId: viewer.userId, postId: { in: ids } },
          select: { postId: true },
        }),
        this.prisma.newsSave.findMany({
          where: { userId: viewer.userId, postId: { in: ids } },
          select: { postId: true },
        }),
        avatarPromise,
      ]);
      liked = new Set(likes.map((l) => l.postId));
      saved = new Set(saves.map((s) => s.postId));
      for (const author of authors) {
        avatarByUserId.set(author.id, author.profileImage);
      }
    } else {
      const authors = await avatarPromise;
      for (const author of authors) {
        avatarByUserId.set(author.id, author.profileImage);
      }
    }

    return posts.map((post) => {
      const isMine =
        (viewer?.role === Roles.USER &&
          post.authorType === NewsAuthorType.USER &&
          post.userId === viewer.userId) ||
        (viewer?.role === Roles.PADDLE_OWNER &&
          post.authorType === NewsAuthorType.PADDLE_OWNER &&
          post.paddleOwnerId === viewer.userId);

      const authorProfileImage =
        post.authorType === NewsAuthorType.USER && post.userId
          ? avatarByUserId.get(post.userId) || null
          : null;

      return {
        ...post,
        images: Array.isArray(post.images) ? post.images : [],
        authorProfileImage,
        likedByMe: liked.has(post.id),
        savedByMe: saved.has(post.id),
        isMine: Boolean(isMine),
      };
    });
  }
}
