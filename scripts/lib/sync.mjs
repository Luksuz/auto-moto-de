// Core of the dealer sync, shared by every entry point so there is exactly one
// implementation:
//
//   scripts/run-due-sources.mjs  one-shot CLI / cron job
//   scripts/scheduler.mjs        long-running service with an internal schedule
//
// Everything it needs is injected, so the caller owns the Prisma client, the S3
// client and the logging.
import { createFirecrawl, createModel, discoverListings, extractDetail } from "./mobilede.mjs";
import { createImporter } from "./car-import.mjs";
import { pool } from "./pool.mjs";

// A source that errors should retry sooner than its normal cadence, but must not
// retry every hour forever — that would burn credits on a dealer whose page has
// permanently moved.
const RETRY_AFTER_FAILURE_H = 6;

// Refuse to delete when a run looks broken rather than genuinely emptier. A dealer
// really can sell half their stock in a fortnight, but a discovery that returns
// nothing (or a fraction of what we hold) is far more likely to be a blocked page
// than a closed business — and deletion here is irreversible.
const MIN_DISCOVERY_RATIO = 0.5;

const hoursFromNow = (h) => new Date(Date.now() + h * 3600_000);
const daysFromNow = (d) => new Date(Date.now() + d * 86_400_000);

/** Build a syncer bound to one set of clients/config. */
export function createSyncer({
  prisma,
  s3,
  bucket,
  endpoint,
  model,
  rpm = 10,
  concurrency = 4,
  dryRun = false,
  log = console.log,
  firecrawlKey,
  openrouterKey,
}) {
  const DRY = dryRun;
  const CONCURRENCY = concurrency;
  const fetchHtml = createFirecrawl({ apiKey: firecrawlKey, rpm, log });
  const extract = createModel({ apiKey: openrouterKey, model, log });
  const importer = createImporter({ prisma, s3, bucket, endpoint, log });

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

  /** A process killed mid-run (deploy, OOM, restart, a cron execution that
   *  overran) leaves its ScrapeRun row at RUNNING forever, which the admin panel
   *  renders as a sync that never ends. Nothing else will ever close those rows,
   *  so every entry point does it before starting work. */
  async function closeAbandonedRuns(staleMinutes = 240) {
    const cutoff = new Date(Date.now() - staleMinutes * 60_000);
    const { count } = await prisma.scrapeRun.updateMany({
      where: { status: "RUNNING", startedAt: { lt: cutoff } },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        message: "Prekinuto — proces je zaustavljen tijekom obrade.",
      },
    });
    if (count > 0) log(`closed ${count} abandoned run(s) left RUNNING by a previous process`);
    return count;
  }

  /** Every enabled source whose nextRunAt has passed. The cadence lives per
   *  dealer in intervalDays, so the caller can tick often and a missed tick
   *  self-heals on the next one instead of waiting another fortnight. */
  async function runDue({ all = false, only = null } = {}) {
    const where = only
      ? { OR: [{ id: only }, { url: only }] }
      : all
        ? { enabled: true }
        : { enabled: true, nextRunAt: { lte: new Date() } };

    const sources = await prisma.dealerSource.findMany({ where, orderBy: { nextRunAt: "asc" } });
    if (sources.length === 0) {
      log("nothing due");
      return { ran: 0, ok: 0, partial: 0, failed: 0 };
    }

    log(`${sources.length} source(s) to run${DRY ? " (dry run — nothing written)" : ""}`);
    const results = [];
    for (const source of sources) results.push(await runSource(source));

    const summary = {
      ran: results.length,
      ok: results.filter((r) => r === "SUCCESS").length,
      partial: results.filter((r) => r === "PARTIAL").length,
      failed: results.filter((r) => r === "FAILED").length,
    };
    log(`\ndone: ${summary.ok} ok, ${summary.partial} partial, ${summary.failed} failed`);
    return summary;
  }

  return { runDue, runSource, closeAbandonedRuns };
}
