-- AlterTable
ALTER TABLE "ingredients" ADD COLUMN "prep_loss_notes" TEXT;
ALTER TABLE "ingredients" ADD COLUMN "yield_percentage" REAL DEFAULT 100;
