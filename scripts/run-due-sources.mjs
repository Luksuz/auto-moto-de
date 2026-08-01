// Scheduled worker: re-scrape every dealer source that is due, and sync the
// results into the database.
//
// The Next app runs on Vercel, whose functions are capped well below the ~10
// minutes a full run needs (36 Firecrawl fetches at 10/min plus ~1000 image
// downloads through sharp). So this runs as a small Railway cron service against
// the same Postgres:
//
//   Railway service → Cron Schedule: 0 * * * *   (hourly)
//                     Start Command: node scripts/run-due-sources.mjs
//
// It ticks HOURLY on purpose while the cadence lives per-dealer in
// DealerSource.intervalDays (default 14 days). That way each dealer can have its
// own interval, a missed tick self-heals on the next hour instead of waiting
// another fortnight, and the admin panel's "Scrape now" button is just
// `nextRunAt = now()` — no HTTP call from Vercel to Railway needed.
//
// Usage:
//   node scripts/run-due-sources.mjs                  # every due source
//   node scripts/run-due-sources.mjs --all            # ignore nextRunAt
//   node scripts/run-due-sources.mjs --source <id|url>
//   node scripts/run-due-sources.mjs --dry-run        # scrape, don't write
import { S3Client } from "@aws-sdk/client-s3";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { createFirecrawl, createModel, discoverListings, extractDetail } from "./lib/mobilede.mjs";
import { createImporter } from "./lib/car-import.mjs";
import { pool } from "./lib/pool.mjs";

process.loadEnvFile(".env");

const args = process.argv.slice(2);
const flag = (name, fallback = null) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
const has = (name) => args.includes(`--${name}`);

const DRY = has("dry-run");
const ONLY = flag("source");
const MODEL = flag("model", process.env.OPENROUTER_EXTRACT_MODEL || "google/gemini-3.1-flash-lite");
const RPM = Number(flag("rpm", process.env.FIRECRAWL_RPM || 10));
// Listings processed at once. Each one holds a decoded photo set in memory while
// sharp writes three sizes, so this trades RAM for wall-clock; 4 keeps a 30-photo
// listing comfortable. Fetching is rate-gated regardless of this number.
const CONCURRENCY = Number(flag("concurrency", 4));

// A source that errors should retry sooner than its normal cadence, but must not
// retry every hour forever — that would burn credits on a dealer whose page has
// permanently moved.
const RETRY_AFTER_FAILURE_H = 6;

// Refuse to delete when a run looks broken rather than genuinely emptier. A dealer
// really can sell half their stock in a fortnight, but a discovery that returns
// nothing (or a fraction of what we hold) is far more likely to be a blocked page
// than a closed business — and deletion here is irreversible.
const MIN_DISCOVERY_RATIO = 0.5;

for (const [name, val] of [
  ["FIRECRAWL_API_KEY", process.env.FIRECRAWL_API_KEY],
  ["OPENROUTER_API_KEY", process.env.OPENROUTER_API_KEY],
  ["DATABASE_URL", process.env.DATABASE_URL],
  ["MINIO_ENDPOINT", process.env.MINIO_ENDPOINT],
]) {
  if (!val) {
    console.error(`${name} missing from the environment`);
    process.exit(1);
  }
}

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

const log = (msg) => console.log(msg);
const fetchHtml = createFirecrawl({ apiKey: process.env.FIRECRAWL_API_KEY, rpm: RPM, log });
const extract = createModel({ apiKey: process.env.OPENROUTER_API_KEY, model: MODEL, log });
const importer = createImporter({
  prisma,
  s3,
  bucket: process.env.MINIO_BUCKET || "kupiauto",
  endpoint: process.env.MINIO_ENDPOINT,
  log,
});

const hoursFromNow = (h) => new Date(Date.now() + h * 3600_000);
const daysFromNow = (d) => new Date(Date.now() + d * 86_400_000);

async function runSource(source) {
  log(`\n=== ${source.label} (${source.url})`);
  const run = DRY
    ? null
    : await prisma.scrapeRun.create({ data: { sourceId: source.id, status: "RUNNING" } });

  const counts = { listingsFound: 0, carsCreated: 0, carsUpdated: 0, carsDeleted: 0, imagesAdded: 0 };
  const problems = [];

  try {
    // --- stage 1: which cars does this dealer list right now? ---
    const found = await discoverListings({ dealerUrl: source.url, fetchHtml, extract, log });
    counts.listingsFound = found.listings.length;

    if (found.reported && found.listings.length < found.reported.cars) {
      problems.push(`page reports ${found.reported.cars} cars, found ${found.listings.length}`);
    }
    if (found.invented > 0) problems.push(`${found.invented} hallucinated id(s) dropped`);
    if (found.listings.length === 0) throw new Error("no listings found — page may be blocked");

    log(
      `${found.listings.length} listing(s)` +
        (found.reported ? ` of ${found.reported.cars} reported` : "") +
        `, customerId ${found.customerId ?? "unknown"}`,
    );

    if (!found.customerId) {
      // Without it the detail URLs fall back to details.html, which renders no
      // gallery — every car would get blind-swept images including other cars'.
      problems.push("no customerId — photo galleries will not render");
    }
    if (!DRY && found.customerId && found.customerId !== source.customerId) {
      await prisma.dealerSource.update({
        where: { id: source.id },
        data: { customerId: found.customerId },
      });
    }

    // --- stage 2: fetch + extract + import each listing ---
    //
    // Run listings concurrently. Firecrawl stays serialized by its own rate gate,
    // so this does not fetch faster — it overlaps the LLM call and the photo
    // uploads of earlier listings with the mandatory wait before the next fetch,
    // instead of stacking them end to end.
    let done = 0;
    await pool(found.listings, CONCURRENCY, async (listing) => {
      const tag = `[${++done}/${found.listings.length}] ${listing.adId}`;
      try {
        const html = await fetchHtml(listing.url);
        const { listing: record } = await extractDetail({
          html,
          url: listing.url,
          adId: listing.adId,
          extract,
          preferredTitle: listing.title,
          log,
        });
        if (record.imagesSource === "fallback") {
          problems.push(`${listing.adId}: no gallery markup, images may be wrong`);
        }

        const res = await importer.importListing(record, {
          dealerSourceId: source.id,
          dryRun: DRY,
        });
        if (res.created) counts.carsCreated++;
        if (res.updated) counts.carsUpdated++;
        counts.imagesAdded += res.images ?? 0;
        if (res.skipped) problems.push(res.skipped);

        log(
          `  ${tag}: ${res.created ? "+ " + res.created : res.updated ? "~ " + res.updated : res.skipped ?? res.dry}`,
        );
      } catch (err) {
        problems.push(`${listing.adId}: ${String(err.message).slice(0, 120)}`);
        console.error(`  ${tag}: ✗ ${String(err.message).slice(0, 120)}`);
      }
    });

    // --- stage 3: cars this dealer no longer lists ---
    // Authority is DISCOVERY, not import success: a listing whose detail page
    // failed to fetch is still listed, and must not be deleted for it.
    const stillListed = new Set(found.listings.map((l) => `mobilede:${l.adId}`));
    const ours = await prisma.car.findMany({
      where: { dealerSourceId: source.id },
      select: { id: true, sourceId: true, title: true },
    });
    const gone = ours.filter((c) => c.sourceId && !stillListed.has(c.sourceId));

    if (gone.length > 0) {
      const ratio = ours.length > 0 ? found.listings.length / ours.length : 1;
      if (ratio < MIN_DISCOVERY_RATIO) {
        problems.push(
          `skipped deleting ${gone.length} car(s): only found ${found.listings.length} of ` +
            `${ours.length} known — looks like a bad scrape, not ${gone.length} sales`,
        );
        log(`  ! refusing to delete ${gone.length} car(s) — discovery ratio ${ratio.toFixed(2)}`);
      } else if (DRY) {
        log(`  would delete ${gone.length} car(s): ${gone.map((c) => c.title.slice(0, 30)).join(", ")}`);
      } else {
        const { deleted, objects } = await importer.deleteCars(gone.map((c) => c.id));
        counts.carsDeleted = deleted;
        log(`  - deleted ${deleted} sold car(s), ${objects} photo(s)`);
        for (const c of gone) log(`      ${c.sourceId} ${c.title.slice(0, 50)}`);
      }
    }

    const status = problems.length > 0 ? "PARTIAL" : "SUCCESS";
    const message = problems.slice(0, 40).join("\n") || null;

    if (!DRY) {
      const carCount = await prisma.car.count({ where: { dealerSourceId: source.id } });
      await prisma.$transaction([
        prisma.scrapeRun.update({
          where: { id: run.id },
          data: { ...counts, status, finishedAt: new Date(), message },
        }),
        prisma.dealerSource.update({
          where: { id: source.id },
          data: {
            lastRunAt: new Date(),
            lastStatus: status,
            lastMessage: message?.slice(0, 500) ?? null,
            carCount,
            nextRunAt: daysFromNow(source.intervalDays),
          },
        }),
      ]);
    }

    log(
      `${status}: +${counts.carsCreated} new, ~${counts.carsUpdated} updated, ` +
        `-${counts.carsDeleted} removed, ${counts.imagesAdded} new photo(s)`,
    );
    return status;
  } catch (err) {
    const message = [String(err.message), ...problems].join("\n").slice(0, 2000);
    console.error(`FAILED: ${String(err.message).slice(0, 200)}`);

    if (!DRY) {
      await prisma.$transaction([
        prisma.scrapeRun.update({
          where: { id: run.id },
          data: { ...counts, status: "FAILED", finishedAt: new Date(), message },
        }),
        prisma.dealerSource.update({
          where: { id: source.id },
          data: {
            lastRunAt: new Date(),
            lastStatus: "FAILED",
            lastMessage: message.slice(0, 500),
            nextRunAt: hoursFromNow(RETRY_AFTER_FAILURE_H),
          },
        }),
      ]);
    }
    return "FAILED";
  }
}

// --- main --------------------------------------------------------------------

const where = ONLY
  ? { OR: [{ id: ONLY }, { url: ONLY }] }
  : has("all")
    ? { enabled: true }
    : { enabled: true, nextRunAt: { lte: new Date() } };

const sources = await prisma.dealerSource.findMany({ where, orderBy: { nextRunAt: "asc" } });

if (sources.length === 0) {
  log("nothing due");
  await prisma.$disconnect();
  process.exit(0);
}

log(`${sources.length} source(s) to run${DRY ? " (dry run — nothing written)" : ""}`);

const results = [];
for (const source of sources) results.push(await runSource(source));

log(
  `\ndone: ${results.filter((r) => r === "SUCCESS").length} ok, ` +
    `${results.filter((r) => r === "PARTIAL").length} partial, ` +
    `${results.filter((r) => r === "FAILED").length} failed`,
);

await prisma.$disconnect();
// A cron service should report failure to its scheduler.
if (results.includes("FAILED")) process.exit(1);
