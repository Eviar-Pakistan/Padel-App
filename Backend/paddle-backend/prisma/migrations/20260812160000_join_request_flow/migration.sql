-- AlterTable
ALTER TABLE "Notification" ADD COLUMN "meta" JSON;

-- CreateTable
CREATE TABLE "CourtBookingJoinRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookingId" TEXT NOT NULL,
    "requesterId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CourtBookingJoinRequest_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "CourtBooking" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CourtBookingJoinRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "CourtBookingJoinRequest_bookingId_requesterId_key" ON "CourtBookingJoinRequest"("bookingId", "requesterId");

-- CreateIndex
CREATE INDEX "CourtBookingJoinRequest_requesterId_idx" ON "CourtBookingJoinRequest"("requesterId");

-- CreateIndex
CREATE INDEX "CourtBookingJoinRequest_status_idx" ON "CourtBookingJoinRequest"("status");
