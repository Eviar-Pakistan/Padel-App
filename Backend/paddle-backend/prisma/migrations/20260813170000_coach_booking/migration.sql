-- CreateTable
CREATE TABLE "CoachBooking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "coachId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "bookingDate" DATETIME NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
    "totalPrice" DECIMAL NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CoachBooking_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CoachBooking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "CoachBooking_coachId_bookingDate_startTime_key" ON "CoachBooking"("coachId", "bookingDate", "startTime");

-- CreateIndex
CREATE INDEX "CoachBooking_userId_idx" ON "CoachBooking"("userId");

-- CreateIndex
CREATE INDEX "CoachBooking_coachId_idx" ON "CoachBooking"("coachId");
