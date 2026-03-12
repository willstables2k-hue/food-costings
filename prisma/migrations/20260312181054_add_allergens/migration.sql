-- CreateTable
CREATE TABLE "allergens" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "key" TEXT NOT NULL,
    "display_name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "ingredient_allergens" (
    "ingredient_id" INTEGER NOT NULL,
    "allergen_id" INTEGER NOT NULL,

    PRIMARY KEY ("ingredient_id", "allergen_id"),
    CONSTRAINT "ingredient_allergens_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "ingredients" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ingredient_allergens_allergen_id_fkey" FOREIGN KEY ("allergen_id") REFERENCES "allergens" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "allergens_key_key" ON "allergens"("key");
