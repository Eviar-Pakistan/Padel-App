-- AlterTable
ALTER TABLE "MatchParticipant" ADD COLUMN "pointsAwarded" INTEGER;

-- CreateTable
CREATE TABLE "MatchPeerRanking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "matchId" TEXT NOT NULL,
    "raterId" INTEGER NOT NULL,
    "rankedUserId" INTEGER NOT NULL,
    "rank" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MatchPeerRanking_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MatchPeerRanking_raterId_fkey" FOREIGN KEY ("raterId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MatchPeerRanking_rankedUserId_fkey" FOREIGN KEY ("rankedUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MatchRefereeRanking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "matchId" TEXT NOT NULL,
    "refereeId" TEXT NOT NULL,
    "rankedUserId" INTEGER NOT NULL,
    "rank" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MatchRefereeRanking_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MatchRefereeRanking_refereeId_fkey" FOREIGN KEY ("refereeId") REFERENCES "Referee" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MatchRefereeRanking_rankedUserId_fkey" FOREIGN KEY ("rankedUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "MatchPeerRanking_matchId_idx" ON "MatchPeerRanking"("matchId");
CREATE INDEX "MatchPeerRanking_rankedUserId_idx" ON "MatchPeerRanking"("rankedUserId");
CREATE UNIQUE INDEX "MatchPeerRanking_matchId_raterId_rankedUserId_key" ON "MatchPeerRanking"("matchId", "raterId", "rankedUserId");
CREATE UNIQUE INDEX "MatchPeerRanking_matchId_raterId_rank_key" ON "MatchPeerRanking"("matchId", "raterId", "rank");

CREATE INDEX "MatchRefereeRanking_matchId_idx" ON "MatchRefereeRanking"("matchId");
CREATE INDEX "MatchRefereeRanking_refereeId_idx" ON "MatchRefereeRanking"("refereeId");
CREATE UNIQUE INDEX "MatchRefereeRanking_matchId_rankedUserId_key" ON "MatchRefereeRanking"("matchId", "rankedUserId");
CREATE UNIQUE INDEX "MatchRefereeRanking_matchId_rank_key" ON "MatchRefereeRanking"("matchId", "rank");
