-- Dealers are now re-synced every 10 days instead of every 14.

-- AlterTable
ALTER TABLE "DealerSource" ALTER COLUMN "intervalDays" SET DEFAULT 10;

-- Every existing dealer moves to the new cadence, not just future ones.
UPDATE "DealerSource" SET "intervalDays" = 10;

-- nextRunAt was stamped from the old 14-day interval when each source last
-- finished, so without this the new cadence would only start after one more
-- 14-day wait.
UPDATE "DealerSource"
SET "nextRunAt" = "lastRunAt" + INTERVAL '10 days'
WHERE "lastRunAt" IS NOT NULL
  AND "nextRunAt" > "lastRunAt" + INTERVAL '10 days';
