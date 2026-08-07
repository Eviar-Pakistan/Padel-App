-- CreateTable
CREATE TABLE "PaddleOwner" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "organizationName" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "PaddleOwner_username_key" ON "PaddleOwner"("username");
