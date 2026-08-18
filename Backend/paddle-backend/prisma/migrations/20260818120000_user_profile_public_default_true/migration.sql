-- Backfill public profiles and set default to true
UPDATE "User" SET "isProfilePublic" = 1;

PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "fullName" TEXT NOT NULL,
    "mobileNumber" TEXT NOT NULL,
    "cnicNumber" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "profileImage" TEXT,
    "handedness" TEXT,
    "skillLevel" TEXT NOT NULL DEFAULT 'BEGINNER',
    "location" TEXT,
    "province" TEXT,
    "isProfilePublic" BOOLEAN NOT NULL DEFAULT true,
    "rank" INTEGER NOT NULL DEFAULT 0,
    "points" INTEGER NOT NULL DEFAULT 0,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

INSERT INTO "new_User" (
  "id", "fullName", "mobileNumber", "cnicNumber", "password", "profileImage",
  "handedness", "skillLevel", "location", "province", "isProfilePublic",
  "rank", "points", "wins", "createdAt", "updatedAt"
)
SELECT
  "id", "fullName", "mobileNumber", "cnicNumber", "password", "profileImage",
  "handedness", "skillLevel", "location", "province",
  COALESCE("isProfilePublic", 1),
  "rank", "points", "wins", "createdAt", "updatedAt"
FROM "User";

DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";

CREATE UNIQUE INDEX "User_mobileNumber_key" ON "User"("mobileNumber");
CREATE UNIQUE INDEX "User_cnicNumber_key" ON "User"("cnicNumber");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
