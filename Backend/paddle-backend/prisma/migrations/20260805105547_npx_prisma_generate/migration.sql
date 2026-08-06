/*
  Warnings:

  - Added the required column `password` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "fullName" TEXT NOT NULL,
    "mobileNumber" TEXT NOT NULL,
    "cnicNumber" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "handedness" TEXT NOT NULL,
    "skillLevel" TEXT NOT NULL,
    "location" TEXT,
    "rank" INTEGER NOT NULL DEFAULT 0,
    "points" INTEGER NOT NULL DEFAULT 0,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("cnicNumber", "createdAt", "fullName", "handedness", "id", "location", "mobileNumber", "points", "rank", "skillLevel", "updatedAt", "wins") SELECT "cnicNumber", "createdAt", "fullName", "handedness", "id", "location", "mobileNumber", "points", "rank", "skillLevel", "updatedAt", "wins" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_mobileNumber_key" ON "User"("mobileNumber");
CREATE UNIQUE INDEX "User_cnicNumber_key" ON "User"("cnicNumber");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
