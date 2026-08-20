-- AlterTable
ALTER TABLE "Coach" ADD COLUMN "createdBy" TEXT NOT NULL DEFAULT 'SELF';
UPDATE "Coach" SET "createdBy" = 'ADMIN' WHERE "paddleOwnerId" IS NOT NULL;

-- AlterTable
ALTER TABLE "Referee" ADD COLUMN "createdBy" TEXT NOT NULL DEFAULT 'SELF';
UPDATE "Referee" SET "createdBy" = 'ADMIN' WHERE "paddleOwnerId" IS NOT NULL;
