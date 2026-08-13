-- AlterTable
ALTER TABLE "CourtBooking" ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "CourtBooking" ADD COLUMN "availableSlots" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "CourtBookingParticipant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookingId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CourtBookingParticipant_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "CourtBooking" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CourtBookingParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "CourtBookingParticipant_bookingId_userId_key" ON "CourtBookingParticipant"("bookingId", "userId");

-- CreateIndex
CREATE INDEX "CourtBookingParticipant_userId_idx" ON "CourtBookingParticipant"("userId");
