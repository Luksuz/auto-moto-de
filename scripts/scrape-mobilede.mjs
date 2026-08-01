// mobile.de scraper (stage 1 of 2) — writes mobilede.json for import-mobilede.mjs.
//
// Two Firecrawl calls, both using structured JSON output:
//
//   1. scrapeResultsPage()  — a dealer/search page -> the ad ids listed on it.
//      Walks pages via ?pageNumber= until the page indicator says we're past
//      the end. mobile.de's next/prev controls are <button>s with no href, so
//      there is nothing to follow; the URL parameter is what works.
//
//   2. scrapeListing()      — a detail page -> the full vehicle record, plus
//      every gallery photo URL harvested from the page's thumbnail markup.
//
// Notes learned the hard way:
//   - onlyMainContent MUST be false. With `true`, mobile.de detail pages come
//     back as ~139 characters of nothing.
//   - No anti-bot proxy or consent-clicking is needed (plain curl gets 403,
//     but Firecrawl's default path gets 200), which keeps this at ~1 credit
//     per page instead of 5.
//   - Dealer pages carry NO details.html links — only `adId=` query params.
//
// Usage:
//   node scripts/scrape-mobilede.mjs <startUrl> [--pages N] [--limit M]
//                                    [--out mobilede.json] [--urls-only]
//
// Then: node scripts/import-mobilede.mjs mobilede.json
import { existsSync, readFileSync, writeFileSync } from "node:fs";

process.loadEnvFile(".env");

const args = process.argv.slice(2);
const flag = (name, fallback = null) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
const has = (name) => args.includes(`--${name}`);

const START_URL = args.find((a) => a.startsWith("http"));
const MAX_PAGES = Number(flag("pages", 25));
const LIMIT = flag("limit") ? Number(flag("limit")) : Infinity;
const OUT = flag("out", "mobilede.json");
const URLS_ONLY = has("urls-only");
const CONCURRENCY = Number(flag("concurrency", 3));

if (!START_URL) {
  console.error(
    "usage: node scripts/scrape-mobilede.mjs <mobile.de url> [--pages N] [--limit M] [--out f.json] [--urls-only]",
  );
  process.exit(1);
}
const API_KEY = process.env.FIRECRAWL_API_KEY;
if (!API_KEY) {
  console.error("FIRECRAWL_API_KEY missing from .env");
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Firecrawl bills per minute, not per second: the free/starter plans allow ~10
// scrape requests/min and answer everything beyond that with a 429. Requests are
// therefore spaced by a single global gate rather than fired concurrently —
// bursting just converts credits into 429s.
const RPM = Number(flag("rpm", 10));
const MIN_INTERVAL_MS = Math.ceil(60000 / Math.max(1, RPM));
let nextSlot = 0;

async function rateLimit() {
  const now = Date.now();
  const wait = Math.max(0, nextSlot - now);
  nextSlot = Math.max(now, nextSlot) + MIN_INTERVAL_MS;
  if (wait > 0) await sleep(wait);
}

class RateLimited extends Error {}

/** One POST to /v2/scrape. */
async function firecrawl(body) {
  await rateLimit();
  const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
    method: "POST",
    headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      // `false` is essential — see header note.
      onlyMainContent: false,
      maxAge: 0,
      timeout: 90000,
      location: { country: "DE", languages: ["de-DE"] },
      ...body,
    }),
  });
  const json = await res.json().catch(() => ({}));

  if (res.status === 429) {
    const retryAfter =
      Number(res.headers.get("retry-after")) ||
      Number(String(json.error ?? "").match(/retry after (\d+)s/i)?.[1]) ||
      30;
    // Push every queued request back past the reset, not just this one.
    nextSlot = Math.max(nextSlot, Date.now() + (retryAfter + 2) * 1000);
    throw new RateLimited(`rate limited, waiting ${retryAfter}s`);
  }
  if (!res.ok || !json.success) {
    throw new Error(`firecrawl ${res.status}: ${JSON.stringify(json).slice(0, 160)}`);
  }
  return json.data;
}

/** Retries both transient site errors (ERR_TUNNEL_CONNECTION_FAILED and friends
 *  are common and usually clear on a second try) and rate limiting. A 429 does
 *  not count against the attempt budget — it means "too fast", not "broken". */
async function withRetry(fn, label, tries = 4) {
  let waits = 0;
  for (let i = 1; ; i++) {
    try {
      return await fn();
    } catch (err) {
      if (err instanceof RateLimited && ++waits <= 10) {
        console.warn(`  ${label}: ${err.message}`);
        i--;
        continue;
      }
      if (i >= tries) throw err;
      console.warn(`  retry ${i}/${tries} ${label}: ${String(err.message).slice(0, 110)}`);
      await sleep(4000 * i);
    }
  }
}

async function pool(items, limit, worker) {
  const results = [];
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        results[i] = await worker(items[i], i).catch((err) => {
          console.error(`  ✗ ${String(err.message).slice(0, 140)}`);
          return null;
        });
      }
    }),
  );
  return results;
}

const detailUrl = (id) => `https://suchen.mobile.de/fahrzeuge/details.html?id=${id}`;

// --- 1. results pages -> ad ids ---------------------------------------------

// Flat JSON Schema: plain scalar types, no ["string","null"] unions and no null
// members inside enums — Firecrawl's extractor is unreliable with those. Every
// field is optional (`required: []`); a value it can't find is simply omitted,
// and the importer treats missing as null.
const LISTINGS_SCHEMA = {
  type: "object",
  required: [],
  properties: {
    listing_ids: {
      type: "array",
      items: { type: "string" },
      description: "The mobile.de ad id (digits only) of every vehicle offered on this page",
    },
    total_offers: { type: "number", description: "Total offers this dealer has, e.g. 34" },
    total_pages: { type: "number", description: "Total result pages, e.g. 2" },
  },
};

const LISTINGS_PROMPT = `Diese Seite listet die Fahrzeugangebote eines Händlers auf mobile.de.

- listing_ids: die Anzeigen-ID jedes aufgeführten Fahrzeugs. Sie erscheint in Links als
  "adId=123456789" oder "details.html?id=123456789". Gib nur die Ziffern zurück, ohne Duplikate.
  Nimm ausschließlich Fahrzeuge dieser Trefferliste auf — keine Werbung und keine
  Fahrzeugempfehlungen anderer Händler.
- total_offers: die Gesamtzahl der Angebote des Händlers, falls angegeben (z. B. "34 Angebote").
- total_pages: die Gesamtzahl der Ergebnisseiten, falls erkennbar (z. B. aus "1/2").`;

/** The LLM is good at this but not authoritative, so union its answer with a
 *  regex sweep of the raw HTML. Dealer pages expose ids only via `adId=`;
 *  search-result pages use `details.html?id=`. Both are matched. */
function idsFromHtml(html) {
  const ids = new Set();
  for (const m of html.matchAll(/details\.html\?[^"'\s]*\bid=(\d+)/g)) ids.add(m[1]);
  for (const m of html.matchAll(/\badId=(\d+)/g)) ids.add(m[1]);
  return ids;
}

function pageIndicator(html) {
  const m = html.match(/mobile-page-indicator[^>]*>\s*(\d+)\s*\/\s*(\d+)\s*</);
  return m ? { page: Number(m[1]), total: Number(m[2]) } : null;
}

async function scrapeResultsPage(url) {
  const doc = await withRetry(
    () =>
      firecrawl({
        url,
        formats: [
          { type: "json", schema: LISTINGS_SCHEMA, prompt: LISTINGS_PROMPT },
          "rawHtml",
        ],
      }),
    `results ${url.slice(0, 70)}`,
  );

  const html = doc?.rawHtml ?? "";
  const fromHtml = idsFromHtml(html);
  const fromLlm = (doc?.json?.listing_ids ?? []).map(String).filter((s) => /^\d+$/.test(s));
  // Keep only LLM ids that the page actually contains — it occasionally
  // hallucinates plausible-looking ids.
  const ids = new Set([...fromHtml, ...fromLlm.filter((id) => html.includes(id))]);

  return {
    ids: [...ids],
    indicator: pageIndicator(html),
    totalOffers: doc?.json?.total_offers ?? null,
    totalPages: doc?.json?.total_pages ?? null,
    blocked: html.length > 0 && ids.size === 0,
  };
}

async function collectListingIds(startUrl) {
  const ids = [];
  const seen = new Set();
  let reported = null;

  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = page === 1 ? startUrl : withPageNumber(startUrl, page);
    let res = await scrapeResultsPage(url);

    // Past the last page mobile.de returns an empty list with an out-of-range
    // indicator (e.g. "3/2"). That is the end, not a block — don't retry it.
    if (res.indicator && res.indicator.page > res.indicator.total) {
      console.log(`page ${page}: past the last page (${res.indicator.page}/${res.indicator.total})`);
      break;
    }
    // A genuine block returns 200 with no ids and no out-of-range indicator.
    for (let attempt = 2; res.blocked && attempt <= 3; attempt++) {
      console.warn(`page ${page}: no listings found — retrying (${attempt}/3)`);
      await sleep(4000);
      res = await scrapeResultsPage(url);
    }

    if (page === 1 && (res.totalOffers || res.indicator)) {
      reported = res;
      console.log(
        `inventory: ${res.totalOffers ?? "?"} offers, ` +
          `${res.indicator?.total ?? res.totalPages ?? "?"} page(s)`,
      );
    }

    const fresh = res.ids.filter((id) => !seen.has(id));
    for (const id of fresh) {
      seen.add(id);
      ids.push(id);
    }
    console.log(`page ${page}: ${res.ids.length} listings (${fresh.length} new, ${ids.length} total)`);

    if (fresh.length === 0) break;
    if (ids.length >= LIMIT) break;
  }

  if (reported?.totalOffers && ids.length < reported.totalOffers) {
    console.warn(
      `! collected ${ids.length} of ${reported.totalOffers} offers the page reports — ` +
        `some may be non-car listings, or a page was blocked`,
    );
  }
  return LIMIT === Infinity ? ids : ids.slice(0, LIMIT);
}

function withPageNumber(url, page) {
  const u = new URL(url);
  u.searchParams.set("pageNumber", String(page));
  return u.href;
}

// --- 2. detail page -> vehicle record + images ------------------------------

// Enum members must match prisma/schema.prisma exactly — the importer writes
// these straight into the database.
const CAR_SCHEMA = {
  type: "object",
  required: [],
  properties: {
    is_car_listing: {
      type: "boolean",
      description: "false if this page is not a single vehicle listing",
    },
    title: { type: "string", description: "Vehicle name without the price, e.g. 'Hyundai KONA'" },
    brand: { type: "string", description: "Manufacturer only, e.g. 'Mercedes-Benz'" },
    model: { type: "string", description: "Model only, e.g. 'GLB 200'" },
    price_eur: {
      type: "number",
      description: "Vehicle price in EUR, digits only. NOT the monthly financing rate.",
    },
    first_registration: {
      type: "string",
      description: "Erstzulassung as MM/YYYY with leading zero, e.g. '06/2019'",
    },
    mileage_km: { type: "number", description: "Kilometerstand, digits only" },
    fuel_type: { type: "string", enum: ["DIESEL", "BENZIN", "HYBRID", "ELEKTRICNI", "PLIN"] },
    transmission: { type: "string", enum: ["AUTOMATSKI", "MANUALNI"] },
    power_kw: { type: "number", description: "kW value from Leistung, e.g. 130" },
    power_ks: { type: "number", description: "PS value from Leistung, e.g. 177" },
    body_type: {
      type: "string",
      enum: [
        "LIMUZINA",
        "KARAVAN",
        "SUV",
        "MONOVOLUMEN",
        "MALI_AUTO",
        "COUPE",
        "KABRIOLET",
        "TERENAC",
        "PICKUP",
      ],
      description:
        "From Kategorie/Fahrzeugtyp. Limousine=LIMUZINA, Kombi=KARAVAN, SUV=SUV, " +
        "Geländewagen=TERENAC, Van/Kleinbus=MONOVOLUMEN, Kleinwagen=MALI_AUTO, " +
        "Sportwagen/Coupé=COUPE, Cabrio/Roadster=KABRIOLET, Pickup=PICKUP",
    },
    engine_ccm: { type: "number", description: "Hubraum in cm³" },
    doors: { type: "string", description: "e.g. '4/5'" },
    seats: { type: "number" },
    air_conditioning: { type: "string", description: "Value of Klimatisierung" },
    parking_sensors: { type: "string", description: "Value of Einparkhilfe" },
    tuv: {
      type: "string",
      description:
        "The HU/TÜV expiry DATE as MM/YYYY, e.g. '02/2027'. Omit this field entirely if only " +
        "the label 'HU' appears with no date — never return 'HU' as the value.",
    },
    emission_class: { type: "string", description: "Schadstoffklasse, e.g. 'Euro 6'" },
    previous_owners: { type: "number", description: "Anzahl der Fahrzeughalter" },
    equipment: {
      type: "array",
      items: { type: "string" },
      description: "Every entry from Ausstattung/Komfort/Sicherheit, one string each",
    },
    description: {
      type: "string",
      description:
        "The seller's Fahrzeugbeschreibung verbatim, without phone numbers, emails, URLs " +
        "or dealer address blocks",
    },
    warranty: { type: "string", description: "Garantie/Gewährleistung note if present" },
  },
};

// Kept short on purpose: the per-field rules live in the schema's `description`
// entries, which the extractor follows more reliably than a long prose prompt.
const CAR_PROMPT = `Extrahiere die Fahrzeugdaten aus diesem mobile.de-Inserat.

Behalte ALLE Texte im deutschen Original — übersetze nichts.

Erfinde nichts: steht ein Wert nicht auf der Seite, lass das Feld komplett weg, statt zu raten
oder die Feldbezeichnung als Wert zurückzugeben. Nimm ausschließlich Daten dieses einen Fahrzeugs,
nicht aus Fahrzeugempfehlungen oder Werbung.

Beachte für jedes Feld die Beschreibung im Schema.`;

/** Image identity on the CDN is the path hash; `rule=` only selects a rendered
 *  size, so normalize every URL to the largest variant. */
function normalizeImageUrl(raw) {
  const cleaned = String(raw).replace(/\\u002F/gi, "/").replace(/&amp;/g, "&").replace(/[\\",]+$/, "");
  if (!/img\.classistatic\.de/.test(cleaned)) return null;
  let u;
  try {
    u = new URL(cleaned);
  } catch {
    return null;
  }
  if (!/\/images\//.test(u.pathname)) return null;
  const hash = u.pathname.split("/").filter(Boolean).pop();
  if (!hash || hash.length < 8) return null;
  u.search = "";
  u.searchParams.set("rule", "mo-1600.jpg");
  return { hash, url: u.href };
}

// The gallery renders one <div data-testid="thumbnail-N"> per photo, each
// wrapping an <img src="…classistatic…">. N runs 0..count-1 and matches the
// "1/28" counter on the page exactly.
const THUMB_RE =
  /data-testid=["']thumbnail-(\d+)["'][\s\S]{0,800}?<img[^>]+src=["'](https:\/\/img\.classistatic\.de[^"']+)["']/gi;
const CDN_RE = /https?:\/\/img\.classistatic\.de\/[^"'\s\\)]+/gi;

/** A blind sweep of every classistatic URL over-collects badly: it picks up the
 *  dealer banner (1200x400), the logo (432x156) and — worse — the 4:3 photos of
 *  OTHER cars in the recommendations carousel, which no aspect-ratio or
 *  document-order heuristic separates. So key off the gallery's own thumbnail
 *  markup, and flag (never silently trust) the fallback. */
function extractImages(html) {
  const byIndex = new Map();
  for (const m of html.matchAll(THUMB_RE)) {
    const img = normalizeImageUrl(m[2]);
    if (img && !byIndex.has(Number(m[1]))) byIndex.set(Number(m[1]), img);
  }
  if (byIndex.size > 0) {
    const ordered = [...byIndex.entries()].sort((a, b) => a[0] - b[0]).map(([, img]) => img);
    const seen = new Set();
    return { source: "gallery", images: ordered.filter((i) => !seen.has(i.hash) && seen.add(i.hash)) };
  }

  const byHash = new Map();
  for (const raw of html.match(CDN_RE) ?? []) {
    const img = normalizeImageUrl(raw);
    if (img && !byHash.has(img.hash)) byHash.set(img.hash, img);
  }
  return { source: "fallback", images: [...byHash.values()] };
}

/** Highest thumbnail index the page rendered, +1. In gallery mode this equals
 *  images.length; if it ever doesn't, the gallery was only partly rendered. */
function renderedThumbCount(html) {
  const idx = [...html.matchAll(/data-testid=["']thumbnail-(\d+)["']/gi)].map((m) => Number(m[1]));
  return idx.length > 0 ? Math.max(...idx) + 1 : null;
}

async function scrapeListing(id) {
  const url = detailUrl(id);
  const doc = await withRetry(
    () => firecrawl({ url, formats: [{ type: "json", schema: CAR_SCHEMA, prompt: CAR_PROMPT }, "rawHtml"] }),
    `listing ${id}`,
  );

  const html = doc?.rawHtml ?? "";
  const extracted = doc?.json;
  if (!extracted || html.length < 5000) return { id, error: `empty page (${html.length} bytes)` };
  if (extracted.is_car_listing === false) return { id, error: "not a vehicle listing" };

  const { source, images } = extractImages(html);
  return {
    url,
    listingId: id,
    scrapedAt: new Date().toISOString(),
    extracted,
    imagesSource: source,
    thumbCount: renderedThumbCount(html),
    images,
  };
}

// --- main -------------------------------------------------------------------

console.log(`start: ${START_URL}\n`);
const ids = await collectListingIds(START_URL);
console.log(`\n${ids.length} distinct listings\n`);
if (ids.length === 0) {
  console.error("nothing to scrape — the page may have been blocked; try re-running");
  process.exit(1);
}

if (URLS_ONLY) {
  for (const id of ids) console.log(detailUrl(id));
  process.exit(0);
}

// Resume: keep anything already scraped into OUT so an interrupted or
// rate-limited run doesn't have to re-buy pages it already paid for.
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

const todo = ids.filter((id) => !done.has(id));
console.log(
  `scraping ${todo.length} listings at ${RPM} req/min (~${Math.ceil((todo.length * MIN_INTERVAL_MS) / 60000)} min)…`,
);

const save = () =>
  writeFileSync(OUT, JSON.stringify(ids.map((id) => done.get(id)).filter(Boolean), null, 2));

let n = 0;
await pool(todo, CONCURRENCY, async (id) => {
  const r = await scrapeListing(id);
  n++;
  if (r.error) {
    console.log(`  [${n}/${todo.length}] ${id}: ${r.error}`);
    return null;
  }
  done.set(id, r);
  save(); // flush after every success — credits spent are never lost
  console.log(
    `  [${n}/${todo.length}] ${id}: ${String(r.extracted.title).slice(0, 44).padEnd(44)} ` +
      `${r.extracted.price_eur ?? "?"} EUR  ${r.images.length} img` +
      `${r.imagesSource === "fallback" ? "  (no gallery markup!)" : ""}`,
  );
  return r;
});

const listings = ids.map((id) => done.get(id)).filter(Boolean);
save();

const totalImgs = listings.reduce((n, l) => n + l.images.length, 0);
console.log(`\nwrote ${OUT}: ${listings.length}/${ids.length} listings, ${totalImgs} images`);

const shaky = listings.filter((l) => l.imagesSource === "fallback");
if (shaky.length > 0) {
  console.warn(
    `\n! ${shaky.length} listing(s) had no gallery markup, so their image lists come from a\n` +
      `  blind page sweep and may include photos of OTHER cars. Re-run to pick them up cleanly:`,
  );
  for (const l of shaky) console.warn(`    ${l.url}  (${l.images.length} images)`);
}

console.log(`\nnext: node scripts/import-mobilede.mjs ${OUT}`);
