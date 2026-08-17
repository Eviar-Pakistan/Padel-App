-- AlterTable
ALTER TABLE "Coach" ADD COLUMN "password" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CoachBooking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "coachId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "bookingDate" DATETIME NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "totalPrice" DECIMAL NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CoachBooking_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CoachBooking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_CoachBooking" ("id", "coachId", "userId", "bookingDate", "startTime", "endTime", "status", "totalPrice", "notes", "createdAt", "updatedAt")
SELECT "id", "coachId", "userId", "bookingDate", "startTime", "endTime", "status", "totalPrice", "notes", "createdAt", "updatedAt" FROM "CoachBooking";
DROP TABLE "CoachBooking";
ALTER TABLE "new_CoachBooking" RENAME TO "CoachBooking";
CREATE UNIQUE INDEX "CoachBooking_coachId_bookingDate_startTime_key" ON "CoachBooking"("coachId", "bookingDate", "startTime");
CREATE INDEX "CoachBooking_userId_idx" ON "CoachBooking"("userId");
CREATE INDEX "CoachBooking_coachId_idx" ON "CoachBooking"("coachId");

-- CreateTable
CREATE TABLE "CoachConversation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "coachId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "bookingId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CoachConversation_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CoachConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CoachConversation_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "CoachBooking" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "CoachConversation_bookingId_key" ON "CoachConversation"("bookingId");
CREATE UNIQUE INDEX "CoachConversation_coachId_userId_key" ON "CoachConversation"("coachId", "userId");
CREATE INDEX "CoachConversation_userId_idx" ON "CoachConversation"("userId");
CREATE INDEX "CoachConversation_coachId_idx" ON "CoachConversation"("coachId");

CREATE TABLE "CoachConversationMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conversationId" TEXT NOT NULL,
    "senderCoachId" TEXT,
    "senderUserId" INTEGER,
    "type" TEXT NOT NULL DEFAULT 'TEXT',
    "text" TEXT,
    "mediaUrl" TEXT,
    "fileName" TEXT,
    "mimeType" TEXT,
    "durationSec" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CoachConversationMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "CoachConversation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CoachConversationMessage_senderCoachId_fkey" FOREIGN KEY ("senderCoachId") REFERENCES "Coach" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CoachConversationMessage_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "CoachConversationMessage_conversationId_createdAt_idx" ON "CoachConversationMessage"("conversationId", "createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
