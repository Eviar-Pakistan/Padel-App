-- AlterTable
ALTER TABLE "Coach" ADD COLUMN "paddleOwnerId" INTEGER;
CREATE INDEX "Coach_paddleOwnerId_idx" ON "Coach"("paddleOwnerId");
