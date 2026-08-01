-- CreateEnum
CREATE TYPE "ScrapeStatus" AS ENUM ('RUNNING', 'SUCCESS', 'PARTIAL', 'FAILED');

-- AlterTable
ALTER TABLE "Car" ADD COLUMN     "dealerSourceId" TEXT;

-- CreateTable
CREATE TABLE "DealerSource" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "customerId" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "intervalDays" INTEGER NOT NULL DEFAULT 14,
    "nextRunAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastRunAt" TIMESTAMP(3),
    "lastStatus" "ScrapeStatus",
    "lastMessage" TEXT,
    "carCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DealerSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScrapeRun" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "status" "ScrapeStatus" NOT NULL DEFAULT 'RUNNING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "listingsFound" INTEGER NOT NULL DEFAULT 0,
    "carsCreated" INTEGER NOT NULL DEFAULT 0,
    "carsUpdated" INTEGER NOT NULL DEFAULT 0,
    "carsDeleted" INTEGER NOT NULL DEFAULT 0,
    "imagesAdded" INTEGER NOT NULL DEFAULT 0,
    "message" TEXT,

    CONSTRAINT "ScrapeRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DealerSource_url_key" ON "DealerSource"("url");

-- CreateIndex
CREATE INDEX "DealerSource_enabled_nextRunAt_idx" ON "DealerSource"("enabled", "nextRunAt");

-- CreateIndex
CREATE INDEX "ScrapeRun_sourceId_startedAt_idx" ON "ScrapeRun"("sourceId", "startedAt");

-- CreateIndex
CREATE INDEX "Car_dealerSourceId_idx" ON "Car"("dealerSourceId");

-- AddForeignKey
ALTER TABLE "Car" ADD CONSTRAINT "Car_dealerSourceId_fkey" FOREIGN KEY ("dealerSourceId") REFERENCES "DealerSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScrapeRun" ADD CONSTRAINT "ScrapeRun_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "DealerSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
