-- CreateTable
CREATE TABLE "UserConversation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userLowId" INTEGER NOT NULL,
    "userHighId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserConversation_userLowId_fkey" FOREIGN KEY ("userLowId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserConversation_userHighId_fkey" FOREIGN KEY ("userHighId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserConversationMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conversationId" TEXT NOT NULL,
    "senderUserId" INTEGER NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'TEXT',
    "text" TEXT,
    "mediaUrl" TEXT,
    "fileName" TEXT,
    "mimeType" TEXT,
    "durationSec" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserConversationMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "UserConversation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserConversationMessage_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlayerChallenge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "challengerId" INTEGER NOT NULL,
    "opponentId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "conversationId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PlayerChallenge_challengerId_fkey" FOREIGN KEY ("challengerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PlayerChallenge_opponentId_fkey" FOREIGN KEY ("opponentId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PlayerChallenge_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "UserConversation" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "UserConversation_userLowId_userHighId_key" ON "UserConversation"("userLowId", "userHighId");

-- CreateIndex
CREATE INDEX "UserConversation_userLowId_idx" ON "UserConversation"("userLowId");

-- CreateIndex
CREATE INDEX "UserConversation_userHighId_idx" ON "UserConversation"("userHighId");

-- CreateIndex
CREATE INDEX "UserConversationMessage_conversationId_createdAt_idx" ON "UserConversationMessage"("conversationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerChallenge_conversationId_key" ON "PlayerChallenge"("conversationId");

-- CreateIndex
CREATE INDEX "PlayerChallenge_challengerId_idx" ON "PlayerChallenge"("challengerId");

-- CreateIndex
CREATE INDEX "PlayerChallenge_opponentId_idx" ON "PlayerChallenge"("opponentId");

-- CreateIndex
CREATE INDEX "PlayerChallenge_status_idx" ON "PlayerChallenge"("status");
