-- CreateTable
CREATE TABLE "Referee" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "profileImage" TEXT,
    "location" TEXT,
    "province" TEXT,
    "hourlyRate" DECIMAL,
    "availableFromDay" TEXT,
    "availableToDay" TEXT,
    "availableFromTime" TEXT,
    "availableToTime" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "paddleOwnerId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Referee_paddleOwnerId_fkey" FOREIGN KEY ("paddleOwnerId") REFERENCES "PaddleOwner" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RefereeCourt" (
    "refereeId" TEXT NOT NULL,
    "courtId" TEXT NOT NULL,
    CONSTRAINT "RefereeCourt_refereeId_fkey" FOREIGN KEY ("refereeId") REFERENCES "Referee" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RefereeCourt_courtId_fkey" FOREIGN KEY ("courtId") REFERENCES "Court" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    PRIMARY KEY ("refereeId", "courtId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Referee_email_key" ON "Referee"("email");

-- CreateIndex
CREATE INDEX "Referee_paddleOwnerId_idx" ON "Referee"("paddleOwnerId");

-- CreateIndex
CREATE INDEX "Referee_status_idx" ON "Referee"("status");

-- CreateIndex
CREATE INDEX "RefereeCourt_courtId_idx" ON "RefereeCourt"("courtId");
