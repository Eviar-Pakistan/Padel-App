-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Court" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "images" JSONB NOT NULL DEFAULT '[]',
    "pricePerHour" DECIMAL NOT NULL,
    "environmentType" TEXT NOT NULL DEFAULT 'OUTDOOR',
    "address" TEXT,
    "latitude" REAL,
    "longitude" REAL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "paddleOwnerId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Court_paddleOwnerId_fkey" FOREIGN KEY ("paddleOwnerId") REFERENCES "PaddleOwner" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Court" ("id", "name", "images", "pricePerHour", "environmentType", "isActive", "paddleOwnerId", "createdAt", "updatedAt")
SELECT "id", "name", "images", "pricePerHour", "environmentType", "isActive", "paddleOwnerId", "createdAt", "updatedAt" FROM "Court";
DROP TABLE "Court";
ALTER TABLE "new_Court" RENAME TO "Court";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
