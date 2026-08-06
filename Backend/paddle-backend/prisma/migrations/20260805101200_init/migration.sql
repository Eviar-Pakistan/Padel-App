-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "fullName" TEXT NOT NULL,
    "mobileNumber" TEXT NOT NULL,
    "cnicNumber" TEXT NOT NULL,
    "handedness" TEXT NOT NULL,
    "skillLevel" TEXT NOT NULL,
    "location" TEXT,
    "rank" INTEGER NOT NULL DEFAULT 0,
    "points" INTEGER NOT NULL DEFAULT 0,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_mobileNumber_key" ON "User"("mobileNumber");

-- CreateIndex
CREATE UNIQUE INDEX "User_cnicNumber_key" ON "User"("cnicNumber");
