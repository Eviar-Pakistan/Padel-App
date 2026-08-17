-- AlterTable
ALTER TABLE "User" ADD COLUMN "province" TEXT;
ALTER TABLE "User" ADD COLUMN "isProfilePublic" BOOLEAN NOT NULL DEFAULT false;
