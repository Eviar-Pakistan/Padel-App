-- Normalize empty emails so optional unique email works
UPDATE "Coach" SET "email" = NULL WHERE "email" = '';
UPDATE "Referee" SET "email" = NULL WHERE "email" = '';

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Coach" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "profileImage" TEXT,
    "email" TEXT,
    "phoneNumber" TEXT NOT NULL,
    "gender" TEXT,
    "dateOfBirth" DATETIME,
    "nationality" TEXT,
    "languages" JSONB,
    "bio" TEXT,
    "yearsOfExperience" INTEGER,
    "certificationLevel" TEXT,
    "specialties" JSONB,
    "sessionRate" DECIMAL,
    "availableFromDay" TEXT,
    "availableToDay" TEXT,
    "availableFromTime" TEXT,
    "availableToTime" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "rating" DECIMAL DEFAULT 0,
    "totalReviews" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "password" TEXT,
    "createdBy" TEXT NOT NULL DEFAULT 'SELF',
    "paddleOwnerId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Coach_paddleOwnerId_fkey" FOREIGN KEY ("paddleOwnerId") REFERENCES "PaddleOwner" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Coach" (
    "id", "firstName", "lastName", "profileImage", "email", "phoneNumber", "gender",
    "dateOfBirth", "nationality", "languages", "bio", "yearsOfExperience",
    "certificationLevel", "specialties", "sessionRate", "availableFromDay",
    "availableToDay", "availableFromTime", "availableToTime", "isVerified",
    "rating", "totalReviews", "status", "password", "createdBy", "paddleOwnerId",
    "createdAt", "updatedAt"
)
SELECT
    "id", "firstName", "lastName", "profileImage", "email", "phoneNumber", "gender",
    "dateOfBirth", "nationality", "languages", "bio", "yearsOfExperience",
    "certificationLevel", "specialties", "sessionRate", "availableFromDay",
    "availableToDay", "availableFromTime", "availableToTime", "isVerified",
    "rating", "totalReviews", "status", "password", "createdBy", "paddleOwnerId",
    "createdAt", "updatedAt"
FROM "Coach";
DROP TABLE "Coach";
ALTER TABLE "new_Coach" RENAME TO "Coach";
CREATE UNIQUE INDEX "Coach_email_key" ON "Coach"("email");
CREATE UNIQUE INDEX "Coach_phoneNumber_key" ON "Coach"("phoneNumber");

CREATE TABLE "new_Referee" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fullName" TEXT NOT NULL,
    "email" TEXT,
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
    "createdBy" TEXT NOT NULL DEFAULT 'SELF',
    "paddleOwnerId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Referee_paddleOwnerId_fkey" FOREIGN KEY ("paddleOwnerId") REFERENCES "PaddleOwner" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Referee" (
    "id", "fullName", "email", "phoneNumber", "password", "profileImage",
    "location", "province", "hourlyRate", "availableFromDay", "availableToDay",
    "availableFromTime", "availableToTime", "status", "createdBy", "paddleOwnerId",
    "createdAt", "updatedAt"
)
SELECT
    "id", "fullName", "email", "phoneNumber", "password", "profileImage",
    "location", "province", "hourlyRate", "availableFromDay", "availableToDay",
    "availableFromTime", "availableToTime", "status", "createdBy", "paddleOwnerId",
    "createdAt", "updatedAt"
FROM "Referee";
DROP TABLE "Referee";
ALTER TABLE "new_Referee" RENAME TO "Referee";
CREATE UNIQUE INDEX "Referee_email_key" ON "Referee"("email");
CREATE UNIQUE INDEX "Referee_phoneNumber_key" ON "Referee"("phoneNumber");
CREATE INDEX "Referee_paddleOwnerId_idx" ON "Referee"("paddleOwnerId");
CREATE INDEX "Referee_status_idx" ON "Referee"("status");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
