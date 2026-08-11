// Give photos back to cars that have none.
//
// A full dealer sync re-scrapes every listing to repair a handful of them: when
// AUTOLIVE's import ran out of storage on 2026-08-11, 54 of its 206 cars were
// left photo-less, and repairing them through run-due-sources.mjs would have
// cost 206 Firecrawl scrapes for 54 cars' worth of photos. This fetches only the
// detail pages of the cars that are actually missing something.
//
// Cars are matched by Car.sourceId ("mobilede:<listingId>") and the dealer's
// customerId, so the detail URL is reconstructed without re-reading the dealer's
// result pages at all — which is where the other 150 scrapes went.
//
// Idempotent: importListing appends only the photos a car does not already have,
// so re-running after a partial repair costs one scrape per still-broken car.
//
// Usage:
//   node scripts/repair-missing-photos.mjs [--source <id|url>] [--dry-run] [--limit N]
import { createImporter, StorageFull } from "./lib/car-import.mjs";
import { createFirecrawl, createModel, extractDetail, detailUrl } from "./lib/mobilede.mjs";
import { createClients, loadEnv, requireEnv, syncConfig, SYNC_ENV } from "./lib/clients.mjs";
import { pool } from "./lib/pool.mjs";

loadEnv();

const args = process.argv.slice(2);
const flag = (name, fallback = null) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
const DRY = args.includes("--dry-run");
const LIMIT = flag("limit") ? Number(flag("limit")) : undefined;
const SOURCE = flag("source");

requireEnv(SYNC_ENV);

const { prisma, s3 } = createClients();
const cfg = syncConfig({});
const log = console.log;

const fetchHtml = createFirecrawl({
  apiKey: cfg.firecrawlKey,
  rpm: cfg.rpm,
  concurrency: cfg.firecrawlConcurrency,
  log,
});
const extract = createModel({ apiKey: cfg.openrouterKey, model: cfg.model, log });
const importer = createImporter({
  prisma,
  s3,
  bucket: cfg.bucket,
  endpoint: cfg.endpoint,
  log,
});

const where = {
  images: { none: {} },
  sourceId: { startsWith: "mobilede:" },
  ...(SOURCE ? { dealerSource: { OR: [{ id: SOURCE }, { url: SOURCE }] } } : {}),
};

const broken = await prisma.car.findMany({
  where,
  select: {
    id: true,
    title: true,
    sourceId: true,
    dealerSourceId: true,
    dealerSource: { select: { label: true, customerId: true, country: true } },
  },
  take: LIMIT,
  orderBy: { createdAt: "asc" },
});

if (broken.length === 0) {
  log("no cars are missing photos");
  await prisma.$disconnect();
  process.exit(0);
}

const byDealer = new Map();
for (const c of broken) {
  const label = c.dealerSource?.label ?? "(no dealer source)";
  byDealer.set(label, (byDealer.get(label) ?? 0) + 1);
}
log(
  `${broken.length} car(s) without photos${DRY ? " (dry run — nothing written)" : ""}:\n` +
    [...byDealer].map(([l, n]) => `  ${n} × ${l}`).join("\n") +
    `\n\n~${broken.length} Firecrawl scrape(s) at ${cfg.rpm}/min ≈ ` +
    `${Math.ceil(broken.length / cfg.rpm)} min\n`,
);

const stats = { repaired: 0, photos: 0, stillBroken: 0, failed: 0 };
let outOfSpace = null;
let done = 0;

await pool(broken, cfg.concurrency, async (car) => {
  if (outOfSpace) return;
  const adId = car.sourceId.split(":")[1];
  const tag = `[${++done}/${broken.length}] ${adId}`;

  // Without the dealer's customerId the URL falls back to the details.html form,
  // which renders no gallery at all — the scrape would come back with no photos
  // and "repair" the car by changing nothing. See rule 3 in lib/mobilede.mjs.
  const customerId = car.dealerSource?.customerId;
  if (!customerId) {
    stats.failed++;
    console.error(`  ${tag}: ✗ dealer has no customerId — run a full sync for this source first`);
    return;
  }

  try {
    const url = detailUrl(adId, customerId);
    const page = await fetchHtml(url);
    const { listing } = await extractDetail({ page, url, adId, extract, log });

    if (listing.images.length === 0) {
      stats.stillBroken++;
      log(`  ${tag}: no photos on the page either (${listing.imagesSource}) — nothing to repair`);
      return;
    }
    if (DRY) {
      log(`  ${tag}: would add ${listing.images.length} photo(s) to ${car.title.slice(0, 40)}`);
      return;
    }

    const res = await importer.importListing(listing, {
      dealerSourceId: car.dealerSourceId,
      country: car.dealerSource?.country ?? "DE",
    });
    if (res.images > 0) {
      stats.repaired++;
      stats.photos += res.images;
    } else {
      stats.stillBroken++;
    }
    log(
      `  ${tag}: +${res.images} photo(s) ${car.title.slice(0, 40)}` +
        (res.failedImages > 0 ? ` [${res.failedImages} failed: ${res.imageError}]` : ""),
    );
  } catch (err) {
    if (err instanceof StorageFull) {
      outOfSpace ??= err;
      console.error(`  ${tag}: ✗ storage is full — stopping`);
      return;
    }
    stats.failed++;
    console.error(`  ${tag}: ✗ ${String(err.message).slice(0, 120)}`);
  }
});

log(
  `\ndone: ${stats.repaired} car(s) repaired with ${stats.photos} photo(s), ` +
    `${stats.stillBroken} still without, ${stats.failed} failed`,
);
if (outOfSpace) {
  console.error(`\n! stopped early: storage is full (${outOfSpace.message})`);
}

await prisma.$disconnect();
process.exit(outOfSpace || stats.failed > 0 ? 1 : 0);
