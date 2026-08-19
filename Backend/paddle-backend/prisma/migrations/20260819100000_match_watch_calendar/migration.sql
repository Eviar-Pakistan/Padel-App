-- CreateTable
CREATE TABLE "MatchWatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" INTEGER NOT NULL,
    "matchId" TEXT NOT NULL,
    "remind" BOOLEAN NOT NULL DEFAULT 0,
    "onCalendar" BOOLEAN NOT NULL DEFAULT 0,
    "notifiedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MatchWatch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MatchWatch_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "MatchWatch_userId_matchId_key" ON "MatchWatch"("userId", "matchId");
CREATE INDEX "MatchWatch_userId_idx" ON "MatchWatch"("userId");
CREATE INDEX "MatchWatch_matchId_idx" ON "MatchWatch"("matchId");
CREATE INDEX "MatchWatch_remind_notifiedAt_idx" ON "MatchWatch"("remind", "notifiedAt");
