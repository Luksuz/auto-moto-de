-- CreateEnum
-- Only DE is implemented (the pipeline reads mobile.de). AT exists so the
-- Germany/Austria split lives in the data rather than being bolted on later.
CREATE TYPE "Country" AS ENUM ('DE', 'AT');

-- AlterTable
-- Defaulted rather than nullable: every row that exists today came from
-- mobile.de, so DE is the truth for all of them and the column never needs a
-- backfill or a null check.
ALTER TABLE "DealerSource" ADD COLUMN "country" "Country" NOT NULL DEFAULT 'DE';

ALTER TABLE "Car" ADD COLUMN "country" "Country" NOT NULL DEFAULT 'DE';

-- CreateIndex
CREATE INDEX "Car_country_idx" ON "Car"("country");
