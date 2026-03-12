-- CreateTable
CREATE TABLE "stock_counts" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "counted_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "stock_count_lines" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "stock_count_id" INTEGER NOT NULL,
    "ingredient_id" INTEGER NOT NULL,
    "counted_quantity" REAL NOT NULL,
    "unit" TEXT NOT NULL,
    CONSTRAINT "stock_count_lines_stock_count_id_fkey" FOREIGN KEY ("stock_count_id") REFERENCES "stock_counts" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "stock_count_lines_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "ingredients" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "stock_count_lines_stock_count_id_idx" ON "stock_count_lines"("stock_count_id");
