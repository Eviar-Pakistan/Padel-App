-- AlterTable
ALTER TABLE "Referee" ADD COLUMN "rating" REAL NOT NULL DEFAULT 0;
ALTER TABLE "Referee" ADD COLUMN "totalReviews" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "MatchRefereeReview" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "matchId" TEXT NOT NULL,
    "refereeId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MatchRefereeReview_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MatchRefereeReview_refereeId_fkey" FOREIGN KEY ("refereeId") REFERENCES "Referee" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MatchRefereeReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "MatchRefereeReview_matchId_userId_key" ON "MatchRefereeReview"("matchId", "userId");

-- CreateIndex
CREATE INDEX "MatchRefereeReview_refereeId_idx" ON "MatchRefereeReview"("refereeId");

-- CreateIndex
CREATE INDEX "MatchRefereeReview_matchId_idx" ON "MatchRefereeReview"("matchId");
