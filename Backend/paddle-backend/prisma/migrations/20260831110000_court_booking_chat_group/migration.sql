-- AlterTable
ALTER TABLE "CourtBooking" ADD COLUMN "chatGroupId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "CourtBooking_chatGroupId_key" ON "CourtBooking"("chatGroupId");
