// Import mobile.de listings into the database: the structured vehicle data is
// mapped onto the Car model, gallery photos are downloaded from the mobile.de CDN,
// optimized with sharp, uploaded to MinIO, and a published Car (+CarImage rows) is
// created.
//
// This is the manual/one-off entry point. The scheduled path is
// scripts/run-due-sources.mjs; both call the same createImporter() in
// scripts/lib/car-import.mjs, so a car imported by hand and one imported by cron
// are byte-for-byte the same row.
//
// No LLM call happens here — extract-listing-details.mjs already did that.
//
// Idempotent via Car.sourceId ("mobilede:<listingId>"): a re-run updates the
// mutable fields (price, mileage) and appends only photos we don't already have.
//
// Usage: node scripts/import-mobilede.mjs [mobilede.json] [--dry-run] [--limit N]
//                                         [--source <dealerSourceId>]
import { readFileSync } from "node:fs";
import { S3Client } from "@aws-sdk/client-s3";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { createImporter } from "./lib/car-import.mjs";

process.loadEnvFile(".env");

const args = process.argv.slice(2);
const flag = (name, fallback = null) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};

const FILE = args.find((a) => !a.startsWith("--") && a !== flag("source")) || "mobilede.json";
const DRY = args.includes("--dry-run");
const LIMIT = flag("limit") ? Number(flag("limit")) : Infinity;
// Attaches the imported cars to a DealerSource so the scheduled worker can later
// tell "this dealer stopped listing it" from "someone else's car".
const DEALER_SOURCE_ID = flag("source");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
const s3 = new S3Client({
  region: process.env.MINIO_REGION || "us-east-1",
  endpoint: process.env.MINIO_ENDPOINT,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY_ID,
    secretAccessKey: process.env.MINIO_SECRET_ACCESS_KEY,
  },
});

const importer = createImporter({
  prisma,
  s3,
  bucket: process.env.MINIO_BUCKET || "kupiauto",
  endpoint: process.env.MINIO_ENDPOINT,
  log: (m) => console.warn(m),
});

async function pool(items, limit, worker) {
  const results = [];
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        results[i] = await worker(items[i], i).catch((err) => {
          console.error(`✗ item ${i}: ${String(err.message).slice(0, 160)}`);
          return null;
        });
      }
    }),
  );
  return results;
}

// --- main --------------------------------------------------------------------

const all = JSON.parse(readFileSync(FILE, "utf8"));
const listings = LIMIT === Infinity ? all : all.slice(0, LIMIT);
console.log(`${listings.length} listings from ${FILE}${DRY ? " (dry run — nothing written)" : ""}\n`);

const results = await pool(listings, 6, (listing) =>
  importer.importListing(listing, { dealerSourceId: DEALER_SOURCE_ID, dryRun: DRY }),
);

const created = results.filter((r) => r?.created);
const updated = results.filter((r) => r?.updated);
const skipped = results.filter((r) => r?.skipped);
const dry = results.filter((r) => r?.dry);

for (const r of dry) console.log(`  ${r.dry}`);
for (const r of created) console.log(`+ ${r.created} (${r.images} images)`);
for (const r of updated) console.log(`~ ${r.updated}`);
for (const r of skipped) console.log(`- skip: ${r.skipped}`);
console.log(
  `\ndone: ${created.length} created, ${updated.length} updated, ${skipped.length} skipped, ` +
    `${results.filter((r) => r === null).length} failed`,
);

await prisma.$disconnect();
