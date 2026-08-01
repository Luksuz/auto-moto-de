-- AlterTable
-- Provenance for scraped cars. Nullable + unique, so existing hand-entered
-- rows are unaffected (Postgres unique indexes ignore NULLs).
ALTER TABLE "Car" ADD COLUMN     "sourceId" TEXT,
ADD COLUMN     "sourceUrl" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Car_sourceId_key" ON "Car"("sourceId");
