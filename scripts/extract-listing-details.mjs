// For every listing found by extract-listing-urls.mjs, fetch the mobile.de detail
// page (Firecrawl, raw HTML) and extract the vehicle record with an LLM
// (OpenRouter, structured JSON output).
//
// Offline counterpart to the detail stage in scripts/run-due-sources.mjs: same
// library, but it writes a JSON file instead of the database and caches every
// fetched page, so re-running to fix a prompt costs tokens and zero Firecrawl
// credits. The scheduled worker deliberately does NOT cache — it must see today's
// prices.
//
// Output is written in the shape import-mobilede.mjs expects:
//   node scripts/extract-listing-details.mjs        -> mobilede.json
//   node scripts/import-mobilede.mjs mobilede.json  -> database
//
// Usage:
//   node scripts/extract-listing-details.mjs [listing-urls.json] [--out mobilede.json]
//        [--limit N] [--model id] [--refetch] [--rpm 10]
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createFirecrawl, createModel, extractDetail } from "./lib/mobilede.mjs";
import { pool } from "./lib/pool.mjs";

process.loadEnvFile(".env");

const args = process.argv.slice(2);
const flag = (name, fallback = null) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
const has = (name) => args.includes(`--${name}`);

const IN = args.find((a) => a.endsWith(".json") && args[args.indexOf(a) - 1] !== "--out")
  ?? "listing-urls.json";
const OUT = flag("out", "mobilede.json");
const CACHE_DIR = flag("cache-dir", ".cache/mobilede-html");
const LIMIT = flag("limit") ? Number(flag("limit")) : Infinity;
const MODEL = flag("model", process.env.OPENROUTER_EXTRACT_MODEL || "google/gemini-3.1-flash-lite");
const REFETCH = has("refetch");
const RPM = Number(flag("rpm", 10));
// Listings in flight at once. Fetching stays rate-gated inside createFirecrawl,
// so this overlaps the LLM calls rather than the downloads — which is the whole
// cost of a re-run against the HTML cache.
const CONCURRENCY = Number(flag("concurrency", 6));

for (const [name, val] of [
  ["FIRECRAWL_API_KEY", process.env.FIRECRAWL_API_KEY],
  ["OPENROUTER_API_KEY", process.env.OPENROUTER_API_KEY],
]) {
  if (!val) {
    console.error(`${name} missing from .env`);
    process.exit(1);
  }
}

const log = (m) => console.warn(m);
const fetchHtml = createFirecrawl({ apiKey: process.env.FIRECRAWL_API_KEY, rpm: RPM, log });
const extract = createModel({ apiKey: process.env.OPENROUTER_API_KEY, model: MODEL, log });

const cachePath = (id) => join(CACHE_DIR, `${id}.html`);

/** Caches both formats: the model reads the markdown, the image scrape reads
 *  the HTML. A cache entry without markdown (written before the switch) still
 *  works — extractDetail falls back to the cleaned HTML. */
async function pageFor(listing) {
  const htmlPath = cachePath(listing.adId);
  const mdPath = htmlPath.replace(/\.html$/, ".md");
  if (!REFETCH && existsSync(htmlPath)) {
    const rawHtml = readFileSync(htmlPath, "utf8");
    const markdown = existsSync(mdPath) ? readFileSync(mdPath, "utf8") : "";
    if (rawHtml.length > 5000) return { page: { rawHtml, markdown }, cached: true };
  }
  const page = await fetchHtml(listing.url);
  if (page.rawHtml.length > 5000) {
    writeFileSync(htmlPath, page.rawHtml);
    if (page.markdown) writeFileSync(mdPath, page.markdown);
  }
  return { page, cached: false };
}

// --- main --------------------------------------------------------------------

const input = JSON.parse(readFileSync(IN, "utf8"));
const all = (Array.isArray(input) ? input : input.listings).map((l) => ({
  adId: String(l.adId ?? l.listingId),
  url: l.url ?? `https://suchen.mobile.de/fahrzeuge/details.html?id=${l.adId}`,
  // The dealer page's headline beats the detail page's title+subTitle — see
  // extractDetail(). Absent when the input is an already-extracted mobilede.json.
  title: l.title ?? null,
}));
const wanted = LIMIT === Infinity ? all : all.slice(0, LIMIT);

mkdirSync(CACHE_DIR, { recursive: true });

// Resume: keep anything already extracted with a clean gallery, so an interrupted
// run doesn't re-buy pages it already paid for.
const done = new Map();
if (existsSync(OUT)) {
  try {
    for (const l of JSON.parse(readFileSync(OUT, "utf8"))) {
      if (l?.listingId && l.imagesSource === "gallery") done.set(String(l.listingId), l);
    }
    if (done.size > 0) console.log(`resuming: ${done.size} listing(s) already in ${OUT}`);
  } catch {
    /* unreadable/partial file — start fresh */
  }
}

const todo = wanted.filter((l) => !done.has(l.adId));
console.log(
  `${wanted.length} listings from ${IN}, ${todo.length} to do\n` +
    `model: ${MODEL}, firecrawl: ${RPM} req/min, cache: ${CACHE_DIR}\n`,
);

// A details.html URL renders no thumbnail markup, so every listing would fall
// through to the blind-sweep fallback. Say so once, up front, rather than N times.
const notVip = todo.filter((l) => !l.url.includes("/home/vip")).length;
if (notVip > 0) {
  console.warn(
    `! ${notVip} URL(s) are not home/vip links.\n` +
      `  Those pages do not render the photo gallery — re-run extract-listing-urls.mjs against\n` +
      `  dealer HTML fetched with onlyMainContent:false so it can emit vip URLs.\n`,
  );
}

const save = () =>
  writeFileSync(OUT, JSON.stringify(wanted.map((l) => done.get(l.adId)).filter(Boolean), null, 2));

let promptTokens = 0;
let completionTokens = 0;
let fetched = 0;
let fromCache = 0;
const problems = [];

let progress = 0;
await pool(todo, CONCURRENCY, async (listing) => {
  const tag = `[${++progress}/${todo.length}] ${listing.adId}`;
  try {
    const { page, cached } = await pageFor(listing);
    if (cached) fromCache++;
    else fetched++;

    const { listing: record, usage } = await extractDetail({
      page,
      url: listing.url,
      adId: listing.adId,
      extract,
      preferredTitle: listing.title,
      log,
    });
    promptTokens += usage.prompt_tokens ?? 0;
    completionTokens += usage.completion_tokens ?? 0;

    done.set(listing.adId, record);
    save(); // flush after every success — credits spent are never lost

    const car = record.extracted;
    console.log(
      `  ${tag}${cached ? " (cached)" : ""}: ${String(car.title ?? "?").slice(0, 40).padEnd(40)} ` +
        `${car.price_eur ?? "?"} EUR  ${record.images.length} img  ${car.equipment.length} equip` +
        `${record.imagesSource === "fallback" ? "  (no gallery markup!)" : ""}`,
    );
  } catch (err) {
    problems.push(`${listing.adId}: ${String(err.message).slice(0, 140)}`);
    console.error(`  ${tag}: ✗ ${String(err.message).slice(0, 140)}`);
  }
});

const listings = wanted.map((l) => done.get(l.adId)).filter(Boolean);
save();

const totalImgs = listings.reduce((n, l) => n + l.images.length, 0);
console.log(
  `\nwrote ${OUT}: ${listings.length}/${wanted.length} listings, ${totalImgs} images\n` +
    `firecrawl: ${fetched} page(s) fetched, ${fromCache} from cache\n` +
    `openrouter: ${promptTokens} in / ${completionTokens} out tokens`,
);

const shaky = listings.filter((l) => l.imagesSource === "fallback");
if (shaky.length > 0) {
  console.warn(
    `\n! ${shaky.length} listing(s) had no gallery markup, so their image lists come from a\n` +
      `  blind page sweep and may include photos of OTHER cars. Re-run with --refetch:`,
  );
  for (const l of shaky) console.warn(`    ${l.url}  (${l.images.length} images)`);
}
for (const l of listings) {
  if (l.imagesSource === "gallery" && l.thumbCount && l.thumbCount !== l.images.length) {
    console.warn(`! ${l.listingId}: gallery rendered ${l.thumbCount} thumbs but kept ${l.images.length}`);
  }
}
if (problems.length > 0) {
  console.warn(`\n${problems.length} problem(s):`);
  for (const p of problems) console.warn(`  ${p}`);
}

console.log(`\nnext: node scripts/import-mobilede.mjs ${OUT} --dry-run`);
