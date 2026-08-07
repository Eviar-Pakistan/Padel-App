-- CreateTable
CREATE TABLE "NewsPost" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "authorType" TEXT NOT NULL,
    "userId" INTEGER,
    "paddleOwnerId" INTEGER,
    "authorName" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "images" JSONB NOT NULL DEFAULT '[]',
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "saveCount" INTEGER NOT NULL DEFAULT 0,
    "shareCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "NewsPost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "NewsPost_paddleOwnerId_fkey" FOREIGN KEY ("paddleOwnerId") REFERENCES "PaddleOwner" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NewsLike" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "postId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NewsLike_postId_fkey" FOREIGN KEY ("postId") REFERENCES "NewsPost" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "NewsLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NewsSave" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "postId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NewsSave_postId_fkey" FOREIGN KEY ("postId") REFERENCES "NewsPost" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "NewsSave_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NewsComment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "postId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "parentId" TEXT,
    "body" TEXT NOT NULL,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "NewsComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "NewsPost" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "NewsComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "NewsComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "NewsComment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NewsCommentLike" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "commentId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NewsCommentLike_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "NewsComment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "NewsCommentLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "NewsPost_createdAt_id_idx" ON "NewsPost"("createdAt", "id");

-- CreateIndex
CREATE INDEX "NewsPost_category_createdAt_idx" ON "NewsPost"("category", "createdAt");

-- CreateIndex
CREATE INDEX "NewsPost_location_createdAt_idx" ON "NewsPost"("location", "createdAt");

-- CreateIndex
CREATE INDEX "NewsPost_userId_idx" ON "NewsPost"("userId");

-- CreateIndex
CREATE INDEX "NewsPost_paddleOwnerId_idx" ON "NewsPost"("paddleOwnerId");

-- CreateIndex
CREATE INDEX "NewsLike_userId_idx" ON "NewsLike"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "NewsLike_postId_userId_key" ON "NewsLike"("postId", "userId");

-- CreateIndex
CREATE INDEX "NewsSave_userId_idx" ON "NewsSave"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "NewsSave_postId_userId_key" ON "NewsSave"("postId", "userId");

-- CreateIndex
CREATE INDEX "NewsComment_postId_createdAt_idx" ON "NewsComment"("postId", "createdAt");

-- CreateIndex
CREATE INDEX "NewsComment_parentId_idx" ON "NewsComment"("parentId");

-- CreateIndex
CREATE INDEX "NewsCommentLike_userId_idx" ON "NewsCommentLike"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "NewsCommentLike_commentId_userId_key" ON "NewsCommentLike"("commentId", "userId");
