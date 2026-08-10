-- CreateTable
CREATE TABLE "ProductCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "paddleOwnerId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProductCategory_paddleOwnerId_fkey" FOREIGN KEY ("paddleOwnerId") REFERENCES "PaddleOwner" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProductBrand" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "paddleOwnerId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProductBrand_paddleOwnerId_fkey" FOREIGN KEY ("paddleOwnerId") REFERENCES "PaddleOwner" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Seed default categories for owners that already have products
INSERT INTO "ProductCategory" ("id", "paddleOwnerId", "name", "slug", "description", "createdAt", "updatedAt")
SELECT
  lower(hex(randomblob(16))),
  "paddleOwnerId",
  'Uncategorized',
  'uncategorized',
  'Migrated default category',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM (SELECT DISTINCT "paddleOwnerId" FROM "Product");

-- Preserve legacy single-image URLs before Product recreate
CREATE TABLE "_legacy_product_images" (
    "productId" TEXT NOT NULL,
    "url" TEXT NOT NULL
);

INSERT INTO "_legacy_product_images" ("productId", "url")
SELECT "id", "image" FROM "Product"
WHERE "image" IS NOT NULL AND "image" != '';

PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "paddleOwnerId" INTEGER NOT NULL,
    "categoryId" TEXT NOT NULL,
    "brandId" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "shortDescription" TEXT,
    "sku" TEXT,
    "barcode" TEXT,
    "price" DECIMAL NOT NULL,
    "compareAtPrice" DECIMAL,
    "costPrice" DECIMAL,
    "currency" TEXT NOT NULL DEFAULT 'PKR',
    "specifications" JSONB,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "weight" DECIMAL,
    "length" DECIMAL,
    "width" DECIMAL,
    "height" DECIMAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Product_paddleOwnerId_fkey" FOREIGN KEY ("paddleOwnerId") REFERENCES "PaddleOwner" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ProductCategory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Product_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "ProductBrand" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_Product" (
  "id", "paddleOwnerId", "categoryId", "brandId", "name", "slug", "description",
  "price", "currency", "status", "isFeatured", "stock", "createdAt", "updatedAt"
)
SELECT
  p."id",
  p."paddleOwnerId",
  c."id",
  NULL,
  p."name",
  lower(replace(replace(p."name", ' ', '-'), '--', '-')) || '-' || substr(p."id", 1, 8),
  p."description",
  p."price",
  'PKR',
  CASE
    WHEN p."status" = 'ACTIVE' THEN 'ACTIVE'
    WHEN p."status" = 'INACTIVE' THEN 'INACTIVE'
    WHEN p."status" = 'OUT_OF_STOCK' THEN 'OUT_OF_STOCK'
    ELSE 'DRAFT'
  END,
  false,
  p."stock",
  p."createdAt",
  p."updatedAt"
FROM "Product" p
JOIN "ProductCategory" c
  ON c."paddleOwnerId" = p."paddleOwnerId" AND c."slug" = 'uncategorized';

DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";

CREATE TABLE "ProductImage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "ProductImage" ("id", "productId", "url", "sortOrder", "createdAt")
SELECT
  lower(hex(randomblob(16))),
  "productId",
  "url",
  0,
  CURRENT_TIMESTAMP
FROM "_legacy_product_images";

DROP TABLE "_legacy_product_images";

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

CREATE UNIQUE INDEX "ProductCategory_paddleOwnerId_slug_key" ON "ProductCategory"("paddleOwnerId", "slug");
CREATE INDEX "ProductCategory_paddleOwnerId_idx" ON "ProductCategory"("paddleOwnerId");
CREATE UNIQUE INDEX "ProductBrand_paddleOwnerId_slug_key" ON "ProductBrand"("paddleOwnerId", "slug");
CREATE INDEX "ProductBrand_paddleOwnerId_idx" ON "ProductBrand"("paddleOwnerId");
CREATE UNIQUE INDEX "Product_paddleOwnerId_slug_key" ON "Product"("paddleOwnerId", "slug");
CREATE INDEX "Product_paddleOwnerId_idx" ON "Product"("paddleOwnerId");
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");
CREATE INDEX "Product_brandId_idx" ON "Product"("brandId");
CREATE INDEX "Product_status_idx" ON "Product"("status");
CREATE INDEX "ProductImage_productId_sortOrder_idx" ON "ProductImage"("productId", "sortOrder");
