-- CreateTable
CREATE TABLE "sales_entries" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "product_id" INTEGER NOT NULL,
    "quantity" REAL NOT NULL,
    "period_date" DATETIME NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sales_entries_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "sales_entries_period_date_idx" ON "sales_entries"("period_date");

-- CreateIndex
CREATE INDEX "sales_entries_product_id_idx" ON "sales_entries"("product_id");
