// Railway Function (Bun v1.3) — scheduled mobile.de dealer sync.
//
// Paste this whole file into the function's Source Code tab.
//
// ── How it runs ─────────────────────────────────────────────────────────────
// Railway cron executes the service's START COMMAND on a schedule and expects
// the process to EXIT when done; a long-running HTTP server is explicitly
// unsuitable, and an execution still running when the next one is due is
// skipped (which is the behaviour we want — a 15 minute sync can never overlap
// itself). So this file defaults to a one-shot run that exits.
//
//   Cron Schedule: 0 * * * *          (hourly; minimum interval is 5 minutes)
//   Start Command: bun index.ts
//
// Set MODE=serve to get an HTTP server instead (GET /api/health,
// POST /api/scrape with `Authorization: Bearer $CRON_SECRET`) for manual runs.
//
// ── Required variables ──────────────────────────────────────────────────────
//   DATABASE_URL            same Postgres as the Next app
//   FIRECRAWL_API_KEY       fetches the HTML (mobile.de 403s plain clients)
//   OPENROUTER_API_KEY      does the extraction
//   MINIO_ENDPOINT, MINIO_BUCKET, MINIO_ACCESS_KEY_ID, MINIO_SECRET_ACCESS_KEY
// Optional: MINIO_REGION, OPENROUTER_EXTRACT_MODEL, FIRECRAWL_RPM, CONCURRENCY,
//           CRON_SECRET (required only for MODE=serve), MODE
//
// ── Relationship to the repo ────────────────────────────────────────────────
// scripts/lib/mobilede.mjs is the CANONICAL implementation of the prompts,
// schemas and scraping rules; this file is a self-contained port because a
// Railway function is a single file with no access to the repo. Keep the
// prompts and schemas in sync, and do NOT schedule this and
// scripts/run-due-sources.mjs at the same time — they would fight over the
// same `nextRunAt` queue.
//
// Two deliberate differences from the repo worker:
//   1. Images are NOT resized here. mobile.de's CDN already publishes fixed
//      sizes (mo-160/240/360/640/1024/1600), so the three we store are fetched
//      ready-made instead of running sharp — no native module in the function,
//      and mo-1600 is ~71 KB where our sharp output was ~290 KB.
//   2. Postgres is written with raw SQL rather than Prisma. Column names are
//      camelCase and therefore quoted; `id` and `updatedAt` have no database
//      default (Prisma sets them client-side), so both are set explicitly.
import { SQL, S3Client } from "bun";
import { Hono } from "hono@4";

// ── config ──────────────────────────────────────────────────────────────────

const env = (name: string, fallback?: string) => {
  const v = process.env[name] ?? fallback;
  if (v === undefined) throw new Error(`${name} missing from the environment`);
  return v;
};

const MODEL = process.env.OPENROUTER_EXTRACT_MODEL ?? "google/gemini-3.1-flash-lite";
const RPM = Number(process.env.FIRECRAWL_RPM ?? 10);
const CONCURRENCY = Number(process.env.CONCURRENCY ?? 4);

// Retry a failed source sooner than its normal cadence, but not every hour
// forever — that burns credits on a dealer whose page has permanently moved.
const RETRY_AFTER_FAILURE_H = 6;

// Refuse to delete when a run looks broken rather than genuinely emptier. A
// dealer can sell half their stock in a fortnight, but discovery returning a
// fraction of what we hold is far more likely to be a blocked page — and the
// deletion is irreversible.
const MIN_DISCOVERY_RATIO = 0.5;

const sql = new SQL(env("DATABASE_URL"));

const BUCKET = process.env.MINIO_BUCKET ?? "kupiauto";
const ENDPOINT = env("MINIO_ENDPOINT");
const s3 = new S3Client({
  accessKeyId: env("MINIO_ACCESS_KEY_ID"),
  secretAccessKey: env("MINIO_SECRET_ACCESS_KEY"),
  bucket: BUCKET,
  endpoint: ENDPOINT,
  region: process.env.MINIO_REGION ?? "us-east-1",
  // MinIO serves <endpoint>/<bucket>/<key>; virtual-hosted style would resolve
  // to <bucket>.<endpoint> and 404.
  virtualHostedStyle: false,
});
const publicUrl = (key: string) => `${ENDPOINT.replace(/\/$/, "")}/${BUCKET}/${encodeURI(key)}`;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const nowSql = () => new Date();
const hoursFromNow = (h: number) => new Date(Date.now() + h * 3600_000);
const daysFromNow = (d: number) => new Date(Date.now() + d * 86_400_000);
// `id` columns are plain text with no database default.
const newId = () => crypto.randomUUID();

// ── Firecrawl ───────────────────────────────────────────────────────────────

class RateLimited extends Error {}

const MIN_INTERVAL_MS = Math.ceil(60000 / Math.max(1, RPM));
let nextSlot = 0;

async function gate() {
  const now = Date.now();
  const wait = Math.max(0, nextSlot - now);
  nextSlot = Math.max(now, nextSlot) + MIN_INTERVAL_MS;
  if (wait > 0) await sleep(wait);
}

async function firecrawlOnce(url: string): Promise<string> {
  await gate();
  const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env("FIRECRAWL_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
      formats: ["rawHtml"],
      // MUST be false: with true, detail pages return ~139 bytes of nothing and
      // dealer pages lose the customerId.
      onlyMainContent: false,
      maxAge: 0,
      timeout: 90000,
      // Deliberately NO `location: {country: "DE"}` — Firecrawl's German egress
      // pool fails to tunnel to mobile.de and returns
      // ERR_TUNNEL_CONNECTION_FAILED on every attempt. The site serves German
      // content regardless of egress.
    }),
  });
  const json: any = await res.json().catch(() => ({}));

  if (res.status === 429) {
    const retryAfter =
      Number(res.headers.get("retry-after")) ||
      Number(String(json.error ?? "").match(/retry after (\d+)s/i)?.[1]) ||
      30;
    nextSlot = Math.max(nextSlot, Date.now() + (retryAfter + 2) * 1000);
    throw new RateLimited(`rate limited, waiting ${retryAfter}s`);
  }
  if (!res.ok || !json.success) {
    throw new Error(`firecrawl ${res.status}: ${JSON.stringify(json).slice(0, 160)}`);
  }
  return json.data?.rawHtml ?? "";
}

/** A 429 means "too fast", not "broken", so it does not consume the attempt
 *  budget. Transient site errors do, but they are common enough on mobile.de
 *  that a short budget gives up on pages that load fine seconds later. */
async function fetchHtml(url: string, tries = 6): Promise<string> {
  let waits = 0;
  for (let i = 1; ; i++) {
    try {
      return await firecrawlOnce(url);
    } catch (err: any) {
      if (err instanceof RateLimited && ++waits <= 10) {
        console.warn(`  ${err.message}`);
        i--;
        continue;
      }
      if (i >= tries) throw err;
      console.warn(`  retry ${i}/${tries}: ${String(err.message).slice(0, 110)}`);
      await sleep(4000 * i);
    }
  }
}

// ── OpenRouter ──────────────────────────────────────────────────────────────

async function extract(
  html: string,
  opts: { schema: object; prompt: string; name: string; label?: string },
): Promise<any> {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env("OPENROUTER_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0,
        messages: [
          { role: "system", content: opts.prompt },
          { role: "user", content: html },
        ],
        response_format: {
          type: "json_schema",
          json_schema: { name: opts.name, strict: true, schema: opts.schema },
        },
      }),
    });
    const json: any = await res.json().catch(() => ({}));

    if (res.ok && !json.error) {
      const content = json.choices?.[0]?.message?.content ?? "";
      try {
        return JSON.parse(content);
      } catch {
        if (attempt >= 3) {
          throw new Error(`${opts.label}: model returned non-JSON: ${content.slice(0, 140)}`);
        }
      }
    } else if (attempt >= 3 || (res.status < 500 && res.status !== 429)) {
      throw new Error(`${opts.label}: openrouter ${res.status}: ${JSON.stringify(json).slice(0, 180)}`);
    }

    console.warn(`  retry ${attempt}/3 model ${opts.label} (http ${res.status})`);
    await sleep(3000 * attempt);
  }
}

// ── HTML helpers ────────────────────────────────────────────────────────────

const clean = (html: string) =>
  html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style|noscript|svg|iframe)\b[\s\S]*?<\/\1>/gi, "")
    .replace(/\s+/g, " ")
    .trim();

/** Split on tag boundaries so a chunk never ends mid-attribute, which would
 *  hide an `adId=` from the model. */
function chunk(text: string, size: number): string[] {
  if (text.length <= size) return [text];
  const parts: string[] = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + size, text.length);
    if (end < text.length) {
      const boundary = text.lastIndexOf("><", end);
      if (boundary > start + size / 2) end = boundary + 1;
    }
    parts.push(text.slice(start, end));
    start = end;
  }
  return parts;
}

function idsFromHtml(html: string): Set<string> {
  const ids = new Set<string>();
  for (const m of html.matchAll(/\badId=(\d+)/g)) ids.add(m[1]);
  for (const m of html.matchAll(/details\.html\?[^"'\s]*\bid=(\d+)/g)) ids.add(m[1]);
  return ids;
}

/** Only present in the FULL page HTML — onlyMainContent:true strips it. */
function customerIdFromHtml(html: string): string | null {
  const hits = new Set([...html.matchAll(/customerId["'=:\\\s]{1,4}(\d{5,})/gi)].map((m) => m[1]));
  return hits.size === 1 ? [...hits][0] : null;
}

function pageIndicator(html: string) {
  const m = html.match(/mobile-page-indicator[^>]*>\s*(\d+)\s*\/\s*(\d+)\s*</);
  return m ? { page: Number(m[1]), total: Number(m[2]) } : null;
}

/** "34 Pkw von 36 Angeboten" — the dealer's own count of CARS is the right
 *  target; the larger number includes non-Pkw offers. */
function reportedCarCount(html: string) {
  const m = html.match(/(\d+)\s*Pkw\s+von\s+(\d+)\s*Angeboten/i);
  return m ? { cars: Number(m[1]), offers: Number(m[2]) } : null;
}

/** Detail pages MUST use this form. suchen.mobile.de/…/details.html renders
 *  zero gallery thumbnails, and without them the image scrape falls back to a
 *  blind sweep that also collects other dealers' cars from the carousel. */
const vipUrl = (id: string, customerId: string) =>
  `https://home.mobile.de/home/vip?vc=Car&customerId=${customerId}&id=${id}`;

function withPageNumber(url: string, page: number) {
  const u = new URL(url);
  u.searchParams.set("pageNumber", String(page));
  return u.href;
}

// ── images ──────────────────────────────────────────────────────────────────

// mobile.de's CDN publishes a fixed set of rendered sizes. Verified present:
// mo-160, mo-240, mo-360, mo-640, mo-1024, mo-1600 (mo-400/480/800/960/1200 all
// 404). We store three of them, which removes any need for sharp here.
const SIZES = [
  { rule: "mo-1600", suffix: "", column: "url" },
  { rule: "mo-1024", suffix: "-1024", column: "medium" },
  { rule: "mo-360", suffix: "-360", column: "thumb" },
] as const;

/** Image identity on the CDN is the path hash; `rule=` only selects a rendered
 *  size, so strip the query and keep the hash. */
function normalizeImageUrl(raw: string): { hash: string; base: string } | null {
  const cleaned = String(raw)
    .replace(/\\u002F/gi, "/")
    .replace(/&amp;/g, "&")
    .replace(/[\\",]+$/, "");
  if (!/img\.classistatic\.de/.test(cleaned)) return null;
  let u: URL;
  try {
    u = new URL(cleaned);
  } catch {
    return null;
  }
  if (!/\/images\//.test(u.pathname)) return null;
  const hash = u.pathname.split("/").filter(Boolean).pop();
  if (!hash || hash.length < 8) return null;
  u.search = "";
  return { hash, base: u.href };
}

// The gallery renders one <div data-testid="thumbnail-N"> per photo. A blind
// sweep of every classistatic URL over-collects badly — dealer banner, logo,
// and photos of OTHER cars from the recommendations carousel — so key off the
// gallery's own markup and flag the fallback rather than trusting it.
const THUMB_RE =
  /data-testid=["']thumbnail-(\d+)["'][\s\S]{0,800}?<img[^>]+src=["'](https:\/\/img\.classistatic\.de[^"']+)["']/gi;
const CDN_RE = /https?:\/\/img\.classistatic\.de\/[^"'\s\\)]+/gi;

function extractImages(html: string) {
  const byIndex = new Map<number, { hash: string; base: string }>();
  for (const m of html.matchAll(THUMB_RE)) {
    const img = normalizeImageUrl(m[2]);
    if (img && !byIndex.has(Number(m[1]))) byIndex.set(Number(m[1]), img);
  }
  if (byIndex.size > 0) {
    const ordered = [...byIndex.entries()].sort((a, b) => a[0] - b[0]).map(([, i]) => i);
    const seen = new Set<string>();
    return {
      source: "gallery" as const,
      images: ordered.filter((i) => !seen.has(i.hash) && seen.add(i.hash)),
    };
  }
  const byHash = new Map<string, { hash: string; base: string }>();
  for (const raw of html.match(CDN_RE) ?? []) {
    const img = normalizeImageUrl(raw);
    if (img && !byHash.has(img.hash)) byHash.set(img.hash, img);
  }
  return { source: "fallback" as const, images: [...byHash.values()] };
}

const imageKey = (listingId: string, hash: string, suffix: string) =>
  `cars/md-${listingId}-${hash}${suffix}.jpg`;

/** Downloads each published size straight from the CDN and stores it as-is. */
async function uploadImage(listingId: string, img: { hash: string; base: string }) {
  const row: Record<string, string> = {};
  for (const size of SIZES) {
    const res = await fetch(`${img.base}?rule=${size.rule}.jpg`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        Referer: "https://suchen.mobile.de/",
      },
    });
    if (!res.ok) throw new Error(`image ${size.rule} ${res.status}`);
    const key = imageKey(listingId, img.hash, size.suffix);
    await s3.write(key, await res.arrayBuffer(), { type: "image/jpeg" });
    if (size.column === "url") {
      row.url = publicUrl(key);
      row.key = key;
    } else {
      row[`${size.column}Url`] = publicUrl(key);
      row[`${size.column}Key`] = key;
    }
  }
  return row;
}

// ── schemas and prompts (keep in sync with scripts/lib/mobilede.mjs) ─────────

const LISTINGS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["listings"],
  properties: {
    listings: {
      type: "array",
      description: "One entry per vehicle offered by this dealer on this page",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["ad_id", "title", "price_eur"],
        properties: {
          ad_id: {
            type: "string",
            description:
              "The mobile.de ad id, digits only. It appears in links as 'adId=123456789' " +
              "or 'details.html?id=123456789'.",
          },
          title: {
            type: "string",
            description:
              "Vehicle title as shown, e.g. 'BMW M135i xDrive H&K 19 Zoll Navi Prof'. " +
              "Without the price and without a leading 'NEU' badge.",
          },
          price_eur: {
            type: ["number", "null"],
            description:
              "Asking price in EUR, digits only (24.490 € -> 24490). NOT the monthly " +
              "financing rate. null if absent.",
          },
        },
      },
    },
  },
};

const LISTINGS_PROMPT = `Du bekommst den HTML-Code einer Händlerseite von mobile.de.

Liste JEDES Fahrzeug auf, das dieser Händler auf dieser Seite anbietet.

- Die Anzeigen-ID steht in Links als "adId=123456789" oder "details.html?id=123456789".
  Gib nur die Ziffern zurück.
- Jedes Fahrzeug genau einmal. Titel erscheinen im Markup oft doppelt — das ist EIN Fahrzeug.
- Ignoriere Werbung, Fahrzeugempfehlungen anderer Händler und Navigationslinks.
- Erfinde keine IDs. Gib nur IDs zurück, die wörtlich im HTML stehen.`;

// Enum members must match the Postgres enum types exactly.
const FUEL = ["DIESEL", "BENZIN", "HYBRID", "ELEKTRICNI", "PLIN"];
const TRANSMISSION = ["AUTOMATSKI", "MANUALNI"];
const BODY = [
  "LIMUZINA", "KARAVAN", "SUV", "MONOVOLUMEN", "MALI_AUTO",
  "COUPE", "KABRIOLET", "TERENAC", "PICKUP",
];

const nullable = (type: string, extra: object = {}) => ({ type: [type, "null"], ...extra });
const nullableEnum = (values: string[], description: string) => ({
  type: ["string", "null"],
  enum: [...values, null],
  description,
});

const CAR_PROPS: Record<string, any> = {
  is_car_listing: {
    type: "boolean",
    description: "false if this page is not a single vehicle listing",
  },
  // mobile.de splits the headline into "title" ("Audi Q5") and "subTitle"
  // ("40 TDI quattro sport/…") and puts the DEALER name in <h1>.
  title: nullable("string", {
    description:
      "The COMPLETE advert headline: the short model name AND the variant/subtitle line " +
      "joined into one string, e.g. 'Audi Q5 40 TDI quattro sport/Anhänger/LED/Tempomat'.",
  }),
  brand: nullable("string", { description: "Manufacturer only, e.g. 'Mercedes-Benz'" }),
  model: nullable("string", { description: "Model only, e.g. 'GLB 200'" }),
  price_eur: nullable("number", {
    description: "Vehicle price in EUR, digits only. NOT the monthly financing rate.",
  }),
  first_registration: nullable("string", {
    description: "Erstzulassung as MM/YYYY with leading zero, e.g. '06/2019'",
  }),
  mileage_km: nullable("number", { description: "Kilometerstand, digits only" }),
  fuel_type: nullableEnum(FUEL, "Kraftstoffart"),
  transmission: nullableEnum(TRANSMISSION, "Getriebe: Automatik=AUTOMATSKI, Schaltgetriebe=MANUALNI"),
  power_kw: nullable("number", { description: "kW value from Leistung" }),
  power_ks: nullable("number", { description: "PS value from Leistung" }),
  body_type: nullableEnum(
    BODY,
    "From Kategorie/Fahrzeugtyp. Limousine=LIMUZINA, Kombi=KARAVAN, SUV=SUV, " +
      "Geländewagen=TERENAC, Van/Kleinbus=MONOVOLUMEN, Kleinwagen=MALI_AUTO, " +
      "Sportwagen/Coupé=COUPE, Cabrio/Roadster=KABRIOLET, Pickup=PICKUP",
  ),
  engine_ccm: nullable("number", { description: "Hubraum in cm³" }),
  doors: nullable("string", { description: "e.g. '4/5'" }),
  seats: nullable("number"),
  air_conditioning: nullable("string", { description: "Value of Klimatisierung" }),
  parking_sensors: nullable("string", { description: "Value of Einparkhilfe" }),
  tuv: nullable("string", {
    description:
      "The HU/TÜV expiry DATE as MM/YYYY. null if only the label 'HU' appears with no date — " +
      "never return 'HU' as the value.",
  }),
  emission_class: nullable("string", { description: "Schadstoffklasse, e.g. 'Euro 6'" }),
  previous_owners: nullable("number", { description: "Anzahl der Fahrzeughalter" }),
  equipment: {
    type: "array",
    items: { type: "string" },
    description: "Every entry from Ausstattung/Komfort/Sicherheit/Extras, one string each",
  },
  // Structured, not free text: dealers separate features with commas, slashes
  // or line breaks, and splitting that in code needs a German abbreviation list
  // that can never be complete.
  description_blocks: {
    type: "array",
    description: "The seller's Fahrzeugbeschreibung, split into blocks in the order they appear.",
    items: {
      type: "object",
      additionalProperties: false,
      required: ["heading", "paragraph", "items"],
      properties: {
        heading: {
          type: ["string", "null"],
          description: "Heading introducing this block, without the trailing colon. null if none.",
        },
        paragraph: {
          type: ["string", "null"],
          description: "Running prose of this block, verbatim in German. null when it is a list.",
        },
        items: {
          type: "array",
          items: { type: "string" },
          description:
            "One entry per individual feature, verbatim. Never merge two features and never " +
            "split a feature containing a slash, such as 'Airbag Fahrer-/Beifahrerseite'.",
        },
      },
    },
  },
  warranty: nullable("string", { description: "Garantie/Gewährleistung note if present" }),
};

const CAR_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: Object.keys(CAR_PROPS),
  properties: CAR_PROPS,
};

const CAR_PROMPT = `Extrahiere die Fahrzeugdaten aus diesem mobile.de-Inserat (HTML).

Behalte ALLE Texte im deutschen Original — übersetze nichts.

Erfinde nichts: steht ein Wert nicht auf der Seite, gib null zurück, statt zu raten
oder die Feldbezeichnung als Wert zurückzugeben. Nimm ausschließlich Daten dieses einen
Fahrzeugs, nicht aus Fahrzeugempfehlungen, Werbung oder Händler-Kontaktdaten.

Fahrzeugbeschreibung (description_blocks):
- Gib die Beschreibung des Verkäufers in der Reihenfolge wieder, in der sie auf der Seite steht.
- Eine Überschrift wie "Sonderausstattung:" beginnt einen neuen Block.
- Ausstattungslisten gehören nach "items", ein Eintrag pro Merkmal — egal ob der Verkäufer mit
  Komma, Schrägstrich oder Zeilenumbruch trennt.
- Fließtext gehört unverändert nach "paragraph".
- Lass Kontaktdaten, Adressen, Öffnungszeiten und Anfahrtsbeschreibungen des Händlers weg.

Beachte für jedes Feld die Beschreibung im Schema.`;

// ── post-processing ─────────────────────────────────────────────────────────

/** A schema is a request, not a guarantee, and these go straight into Postgres
 *  enum columns. Anything outside the allowed set becomes null. */
function sanitize(car: any, warn: (m: string) => void) {
  for (const [field, allowed] of Object.entries({
    fuel_type: FUEL,
    transmission: TRANSMISSION,
    body_type: BODY,
  })) {
    const v = car[field];
    if (v != null && !allowed.includes(v)) {
      warn(`${field}="${v}" not in enum -> null`);
      car[field] = null;
    }
  }
  if (car.tuv && !/^\d{2}\/\d{4}$/.test(String(car.tuv).trim())) {
    warn(`tuv="${car.tuv}" is not MM/YYYY -> null`);
    car.tuv = null;
  }
  if (!Array.isArray(car.equipment)) car.equipment = [];
  car.equipment = [...new Set(car.equipment.map((e: any) => String(e).trim()).filter(Boolean))];
  return car;
}

/** Flatten the model's blocks into the plain-text convention the site renders:
 *  a heading on its own line, one "• item" per feature, blank line between
 *  blocks. This only serializes what the model already separated. */
function blocksToText(blocks: any): string | null {
  if (!Array.isArray(blocks)) return null;
  const out: string[] = [];
  for (const b of blocks) {
    const heading = String(b?.heading ?? "").trim();
    const paragraph = String(b?.paragraph ?? "").trim();
    const items = Array.isArray(b?.items)
      ? b.items.map((i: any) => String(i).trim()).filter(Boolean)
      : [];
    if (!heading && !paragraph && items.length === 0) continue;
    if (out.length > 0) out.push("");
    if (heading) out.push(heading.replace(/:+$/, "") + ":");
    if (paragraph) out.push(paragraph);
    for (const i of items) out.push(`• ${i}`);
  }
  const text = out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  return text.length >= 15 ? text : null;
}

/** The prompt asks the model to drop the selling dealer's contact details; in
 *  sampling it kept a dealer URL and opening hours anyway. Publishing a
 *  competitor's website on the client's car page is not left to chance. */
function scrubDealerContact(text: string | null): string | null {
  if (!text) return text;
  let out = text;
  const clause = (inner: string) => new RegExp(`[^.!?\\n•]*${inner}[^.!?\\n]*[.!?]?`, "gi");
  out = out.replace(clause("(?:https?:\\/\\/|www\\.)\\S+"), "");
  out = out.replace(clause("[\\w.+-]+@[\\w-]+\\.[\\w.]+"), "");
  out = out.replace(clause("(?:tel\\.?|telefon|mobil|handy|fax)\\s*:?\\s*[+\\d][\\d\\s()/-]{6,}"), "");
  const footer = out.search(/(unsere\s+)?(öffnungszeiten|anfahrt|so finden sie uns)\b/i);
  if (footer !== -1) out = out.slice(0, footer);
  return out
    .split("\n")
    .map((l) => l.replace(/[ \t]+/g, " ").trim())
    .filter((l, i, a) => !(l === "" && a[i - 1] === ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const KW_PER_KS = 0.7355;
const REG_RE = /^(0[1-9]|1[0-2])\/\d{4}$/;

function normalizeRegistration(value: string | null): string | null {
  const raw = (value ?? "").trim();
  if (REG_RE.test(raw)) return raw;
  let m = raw.match(/^(\d{1,2})\s*[/.\-]\s*(\d{4})$/);
  if (m) return `${String(Math.min(12, Math.max(1, Number(m[1])))).padStart(2, "0")}/${m[2]}`;
  m = raw.match(/\b(19|20)\d{2}\b/);
  return m ? `01/${m[0]}` : null;
}

/** getFilterFacets() builds the public brand dropdown from DISTINCT Car.brand,
 *  so "Skoda" and "Škoda" would appear as two filters. */
const BRAND_ALIASES = new Map(Object.entries({
  skoda: "Škoda", "škoda": "Škoda", vw: "Volkswagen", volkswagen: "Volkswagen",
  mercedes: "Mercedes-Benz", "mercedes benz": "Mercedes-Benz", "mercedes-benz": "Mercedes-Benz",
  bmw: "BMW", audi: "Audi", seat: "SEAT", cupra: "CUPRA", citroen: "Citroën", "citroën": "Citroën",
  opel: "Opel", peugeot: "Peugeot", renault: "Renault", ford: "Ford", hyundai: "Hyundai",
  kia: "Kia", toyota: "Toyota", nissan: "Nissan", mazda: "Mazda", volvo: "Volvo", fiat: "Fiat",
  dacia: "Dacia", mini: "MINI", "land rover": "Land Rover", "range rover": "Land Rover",
  jeep: "Jeep", porsche: "Porsche", tesla: "Tesla", suzuki: "Suzuki", mitsubishi: "Mitsubishi",
  honda: "Honda", "alfa romeo": "Alfa Romeo",
}));

const normalizeBrand = (b: string | null) =>
  !b?.trim() ? "" : (BRAND_ALIASES.get(b.trim().toLowerCase()) ?? b.trim());

const slugify = (input: string) =>
  input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 80);

// ── concurrency ─────────────────────────────────────────────────────────────

/** Firecrawl stays serialized by its own rate gate, so this does not fetch
 *  faster — it overlaps the LLM call and the photo uploads of earlier listings
 *  with the mandatory wait before the next fetch. */
async function pool<T>(items: T[], limit: number, worker: (item: T) => Promise<void>) {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
      while (next < items.length) await worker(items[next++]);
    }),
  );
}

// ── stage 1: dealer page -> listings ────────────────────────────────────────

type Listing = { adId: string; url: string; title: string | null; priceEur: number | null };

async function discoverListings(dealerUrl: string) {
  const truth = new Set<string>();
  const fromModel: any[] = [];
  let customerId: string | null = null;
  let reported: { cars: number; offers: number } | null = null;

  for (let page = 1; page <= 25; page++) {
    const html = await fetchHtml(page === 1 ? dealerUrl : withPageNumber(dealerUrl, page));

    // Past the last page mobile.de returns an out-of-range indicator ("3/2").
    const indicator = pageIndicator(html);
    if (indicator && indicator.page > indicator.total) break;

    customerId ??= customerIdFromHtml(html);
    reported ??= reportedCarCount(html);

    const before = truth.size;
    for (const id of idsFromHtml(html)) truth.add(id);

    for (const part of chunk(clean(html), 400_000)) {
      const data = await extract(part, {
        schema: LISTINGS_SCHEMA,
        prompt: LISTINGS_PROMPT,
        name: "dealer_listings",
        label: `page ${page}`,
      });
      fromModel.push(...(data.listings ?? []));
    }

    const fresh = truth.size - before;
    console.log(`page ${page}: ${fresh} new (${truth.size} total)`);
    if (fresh === 0) break;
  }

  // The LLM extracts, a regex audits: ids it returns are verified to occur in
  // the HTML, and ids it missed are added back.
  const kept = new Map<string, Listing>();
  let invented = 0;
  for (const l of fromModel) {
    const id = String(l.ad_id ?? "").replace(/\D/g, "");
    if (!id) continue;
    if (!truth.has(id)) {
      invented++;
      continue;
    }
    if (!kept.has(id) && customerId) {
      kept.set(id, {
        adId: id,
        url: vipUrl(id, customerId),
        title: l.title ?? null,
        priceEur: l.price_eur ?? null,
      });
    }
  }
  const missed = [...truth].filter((id) => !kept.has(id));
  for (const id of missed) {
    if (customerId) {
      kept.set(id, { adId: id, url: vipUrl(id, customerId), title: null, priceEur: null });
    }
  }

  return { listings: [...kept.values()], customerId, reported, invented, missed };
}

// ── stage 2: detail page -> car record ──────────────────────────────────────

async function extractDetail(listing: Listing, html: string, warn: (m: string) => void) {
  if (html.length < 5000) throw new Error(`empty page (${html.length} bytes)`);

  const car = await extract(clean(html), {
    schema: CAR_SCHEMA,
    prompt: CAR_PROMPT,
    name: "vehicle",
    label: listing.adId,
  });
  if (car.is_car_listing === false) throw new Error("not a vehicle listing");

  // The dealer page's headline beats the detail page's title+subTitle, which
  // overlap for some brands ("Hyundai TUCSON" + "Tucson Pure 2WD").
  if (listing.title?.trim()) car.title = listing.title.trim();
  sanitize(car, warn);
  car.description = scrubDealerContact(blocksToText(car.description_blocks));

  const { source, images } = extractImages(html);
  if (source === "fallback") warn(`${listing.adId}: no gallery markup, images may be wrong`);
  return { car, images };
}

// ── database ────────────────────────────────────────────────────────────────

async function uniqueSlug(base: string, ignoreId?: string) {
  const root = slugify(base) || "vozilo";
  for (let i = 1; ; i++) {
    const slug = i === 1 ? root : `${root}-${i}`.slice(0, 80);
    const [hit] = await sql`select id from "Car" where slug = ${slug} limit 1`;
    if (!hit || hit.id === ignoreId) return slug;
  }
}

/** Idempotent on Car.sourceId ("mobilede:<adId>"): a re-run refreshes the
 *  mutable fields and appends only photos we do not already have. */
async function importListing(listing: Listing, car: any, images: any[], dealerSourceId: string) {
  if (!car.title?.trim()) return { skipped: `no title: ${listing.adId}`, images: 0 };
  // priceEur is NOT NULL — "Preis auf Anfrage" cannot be imported.
  if (!car.price_eur || car.price_eur <= 0) return { skipped: `no price: ${listing.adId}`, images: 0 };

  const sourceId = `mobilede:${listing.adId}`;
  const reg = normalizeRegistration(car.first_registration) ?? "01/2000";
  const brand = normalizeBrand(car.brand) || car.title.trim().split(/\s+/)[0];
  const powerKw = car.power_kw ?? (car.power_ks ? Math.round(car.power_ks * KW_PER_KS) : 0);
  const powerKs = car.power_ks ?? (car.power_kw ? Math.round(car.power_kw / KW_PER_KS) : 0);

  const [existing] = await sql`
    select id, title from "Car" where "sourceId" = ${sourceId} limit 1`;

  if (existing) {
    // Price and mileage move while a listing is live. Never touch slug/published.
    await sql`
      update "Car" set
        title = ${car.title.trim()}, brand = ${brand}, model = ${(car.model ?? "").trim()},
        "priceEur" = ${Math.round(car.price_eur)},
        "bodyType" = ${car.body_type ?? "LIMUZINA"}::"BodyType",
        "firstRegistration" = ${reg},
        "mileageKm" = ${Math.max(0, Math.round(car.mileage_km ?? 0))},
        "fuelType" = ${car.fuel_type ?? "DIESEL"}::"FuelType",
        "powerKw" = ${powerKw}, "powerKs" = ${powerKs},
        transmission = ${car.transmission ?? "MANUALNI"}::"Transmission",
        "engineCcm" = ${car.engine_ccm ?? null}, doors = ${car.doors ?? null},
        seats = ${car.seats ?? null}, "airConditioning" = ${car.air_conditioning ?? null},
        "parkingSensors" = ${car.parking_sensors ?? null}, tuv = ${car.tuv ?? null},
        "emissionClass" = ${car.emission_class ?? null},
        "previousOwners" = ${car.previous_owners ?? null},
        description = ${car.description ?? null}, warranty = ${car.warranty ?? null},
        equipment = ${car.equipment}, "sourceUrl" = ${listing.url},
        "dealerSourceId" = ${dealerSourceId}, "updatedAt" = ${nowSql()}
      where id = ${existing.id}`;

    const have = new Set(
      (await sql`select key from "CarImage" where "carId" = ${existing.id}`).map((r: any) => r.key),
    );
    const missing = images.filter((img) => !have.has(imageKey(listing.adId, img.hash, "")));
    let added = 0;
    for (const [i, img] of missing.entries()) {
      try {
        const row = await uploadImage(listing.adId, img);
        await insertImage(existing.id, row, `${existing.title} — slika ${have.size + i + 1}`, have.size + i);
        added++;
      } catch {
        /* one bad photo must not fail the listing */
      }
    }
    return { updated: sourceId, images: added };
  }

  const slug = await uniqueSlug(`${car.title.trim()} ${reg.replace("/", "")}`);
  const carId = newId();
  await sql`
    insert into "Car" (
      id, slug, title, brand, model, published, featured, "priceEur", "bodyType",
      "firstRegistration", "mileageKm", "fuelType", "powerKw", "powerKs", transmission,
      "engineCcm", doors, seats, "airConditioning", "parkingSensors", tuv, "emissionClass",
      "previousOwners", description, warranty, equipment, "sourceId", "sourceUrl",
      "dealerSourceId", "updatedAt"
    ) values (
      ${carId}, ${slug}, ${car.title.trim()}, ${brand}, ${(car.model ?? "").trim()}, true, false,
      ${Math.round(car.price_eur)}, ${car.body_type ?? "LIMUZINA"}::"BodyType",
      ${reg}, ${Math.max(0, Math.round(car.mileage_km ?? 0))},
      ${car.fuel_type ?? "DIESEL"}::"FuelType", ${powerKw}, ${powerKs},
      ${car.transmission ?? "MANUALNI"}::"Transmission",
      ${car.engine_ccm ?? null}, ${car.doors ?? null}, ${car.seats ?? null},
      ${car.air_conditioning ?? null}, ${car.parking_sensors ?? null}, ${car.tuv ?? null},
      ${car.emission_class ?? null}, ${car.previous_owners ?? null},
      ${car.description ?? null}, ${car.warranty ?? null}, ${car.equipment},
      ${sourceId}, ${listing.url}, ${dealerSourceId}, ${nowSql()}
    )`;

  let added = 0;
  for (const [i, img] of images.entries()) {
    try {
      const row = await uploadImage(listing.adId, img);
      await insertImage(carId, row, `${car.title.trim()} — slika ${i + 1}`, i);
      added++;
    } catch {
      /* skip the photo, keep the car */
    }
  }
  return { created: slug, images: added };
}

async function insertImage(carId: string, row: Record<string, string>, alt: string, sortOrder: number) {
  await sql`
    insert into "CarImage" (id, "carId", url, key, alt, "sortOrder", "isPrimary",
                            "thumbUrl", "thumbKey", "mediumUrl", "mediumKey")
    values (${newId()}, ${carId}, ${row.url}, ${row.key}, ${alt}, ${sortOrder}, ${sortOrder === 0},
            ${row.thumbUrl ?? null}, ${row.thumbKey ?? null},
            ${row.mediumUrl ?? null}, ${row.mediumKey ?? null})`;
}

/** Cars the dealer no longer lists. Leads referencing them survive with carId
 *  set to null (onDelete: SetNull), so enquiry history is not lost. */
async function deleteCars(carIds: string[]) {
  if (carIds.length === 0) return 0;
  const rows = await sql`
    select key, "thumbKey", "mediumKey" from "CarImage" where "carId" = any(${carIds})`;
  for (const r of rows) {
    for (const k of [r.key, r.thumbKey, r.mediumKey].filter(Boolean)) {
      // An orphaned object costs storage; a failed delete must not abort the run.
      try {
        await s3.delete(k as string);
      } catch {
        /* ignore */
      }
    }
  }
  await sql`delete from "Car" where id = any(${carIds})`; // CarImage cascades
  return carIds.length;
}

// ── one source ──────────────────────────────────────────────────────────────

async function runSource(source: any): Promise<string> {
  console.log(`\n=== ${source.label} (${source.url})`);
  const runId = newId();
  await sql`
    insert into "ScrapeRun" (id, "sourceId", status) values (${runId}, ${source.id}, 'RUNNING')`;

  const counts = { listingsFound: 0, carsCreated: 0, carsUpdated: 0, carsDeleted: 0, imagesAdded: 0 };
  const problems: string[] = [];
  const warn = (m: string) => {
    problems.push(m);
    console.warn(`  ! ${m}`);
  };

  try {
    const found = await discoverListings(source.url);
    counts.listingsFound = found.listings.length;

    if (!found.customerId) throw new Error("no customerId on the dealer page");
    if (found.listings.length === 0) throw new Error("no listings found — page may be blocked");
    if (found.reported && found.listings.length < found.reported.cars) {
      warn(`page reports ${found.reported.cars} cars, found ${found.listings.length}`);
    }
    if (found.invented > 0) warn(`${found.invented} hallucinated id(s) dropped`);

    console.log(`${found.listings.length} listing(s), customerId ${found.customerId}`);
    if (found.customerId !== source.customerId) {
      await sql`
        update "DealerSource" set "customerId" = ${found.customerId}, "updatedAt" = ${nowSql()}
        where id = ${source.id}`;
    }

    let done = 0;
    await pool(found.listings, CONCURRENCY, async (listing) => {
      const tag = `[${++done}/${found.listings.length}] ${listing.adId}`;
      try {
        const html = await fetchHtml(listing.url);
        const { car, images } = await extractDetail(listing, html, warn);
        const res = await importListing(listing, car, images, source.id);
        if (res.created) counts.carsCreated++;
        if (res.updated) counts.carsUpdated++;
        if (res.skipped) problems.push(res.skipped);
        counts.imagesAdded += res.images;
        console.log(`  ${tag}: ${res.created ?? res.updated ?? res.skipped}`);
      } catch (err: any) {
        problems.push(`${listing.adId}: ${String(err.message).slice(0, 120)}`);
        console.error(`  ${tag}: ✗ ${String(err.message).slice(0, 120)}`);
      }
    });

    // Authority is DISCOVERY, not import success: a listing whose detail page
    // failed to fetch is still listed and must not be deleted for it.
    const stillListed = new Set(found.listings.map((l) => `mobilede:${l.adId}`));
    const ours = await sql`
      select id, "sourceId", title from "Car" where "dealerSourceId" = ${source.id}`;
    const gone = ours.filter((c: any) => c.sourceId && !stillListed.has(c.sourceId));

    if (gone.length > 0) {
      const ratio = ours.length > 0 ? found.listings.length / ours.length : 1;
      if (ratio < MIN_DISCOVERY_RATIO) {
        warn(
          `skipped deleting ${gone.length} car(s): only found ${found.listings.length} of ` +
            `${ours.length} known — looks like a bad scrape, not ${gone.length} sales`,
        );
      } else {
        counts.carsDeleted = await deleteCars(gone.map((c: any) => c.id));
        console.log(`  - deleted ${counts.carsDeleted} sold car(s)`);
      }
    }

    const status = problems.length > 0 ? "PARTIAL" : "SUCCESS";
    const message = problems.slice(0, 40).join("\n") || null;
    const [{ count }] = await sql`
      select count(*)::int as count from "Car" where "dealerSourceId" = ${source.id}`;

    await sql`
      update "ScrapeRun" set status = ${status}::"ScrapeStatus", "finishedAt" = ${nowSql()},
        "listingsFound" = ${counts.listingsFound}, "carsCreated" = ${counts.carsCreated},
        "carsUpdated" = ${counts.carsUpdated}, "carsDeleted" = ${counts.carsDeleted},
        "imagesAdded" = ${counts.imagesAdded}, message = ${message}
      where id = ${runId}`;
    await sql`
      update "DealerSource" set "lastRunAt" = ${nowSql()}, "lastStatus" = ${status}::"ScrapeStatus",
        "lastMessage" = ${message?.slice(0, 500) ?? null}, "carCount" = ${count},
        "nextRunAt" = ${daysFromNow(source.intervalDays)}, "updatedAt" = ${nowSql()}
      where id = ${source.id}`;

    console.log(
      `${status}: +${counts.carsCreated} new, ~${counts.carsUpdated} updated, ` +
        `-${counts.carsDeleted} removed, ${counts.imagesAdded} photo(s)`,
    );
    return status;
  } catch (err: any) {
    const message = [String(err.message), ...problems].join("\n").slice(0, 2000);
    console.error(`FAILED: ${message.slice(0, 200)}`);
    await sql`
      update "ScrapeRun" set status = 'FAILED', "finishedAt" = ${nowSql()},
        "listingsFound" = ${counts.listingsFound}, message = ${message} where id = ${runId}`;
    await sql`
      update "DealerSource" set "lastRunAt" = ${nowSql()}, "lastStatus" = 'FAILED',
        "lastMessage" = ${message.slice(0, 500)}, "nextRunAt" = ${hoursFromNow(RETRY_AFTER_FAILURE_H)},
        "updatedAt" = ${nowSql()} where id = ${source.id}`;
    return "FAILED";
  }
}

// ── entry points ────────────────────────────────────────────────────────────

/** Every enabled source whose nextRunAt has passed. The cadence lives per
 *  dealer in intervalDays, so this can tick hourly and a missed tick self-heals
 *  on the next hour instead of waiting another fortnight. */
async function runDue(all = false) {
  const sources = all
    ? await sql`select * from "DealerSource" where enabled = true order by "nextRunAt" asc`
    : await sql`
        select * from "DealerSource"
        where enabled = true and "nextRunAt" <= ${nowSql()} order by "nextRunAt" asc`;

  if (sources.length === 0) {
    console.log("nothing due");
    return { ran: 0, ok: 0, partial: 0, failed: 0 };
  }

  console.log(`${sources.length} source(s) due`);
  const results: string[] = [];
  for (const s of sources) results.push(await runSource(s));

  const summary = {
    ran: results.length,
    ok: results.filter((r) => r === "SUCCESS").length,
    partial: results.filter((r) => r === "PARTIAL").length,
    failed: results.filter((r) => r === "FAILED").length,
  };
  console.log(`\ndone: ${summary.ok} ok, ${summary.partial} partial, ${summary.failed} failed`);
  return summary;
}

if (process.env.MODE === "serve") {
  // Manual/HTTP mode. NOT for Railway cron — a cron service must exit, and a
  // process that stays up causes every subsequent scheduled run to be skipped.
  const app = new Hono();
  app.get("/api/health", (c) => c.json({ status: "ok" }));
  app.post("/api/scrape", async (c) => {
    const secret = process.env.CRON_SECRET;
    if (!secret || c.req.header("authorization") !== `Bearer ${secret}`) {
      return c.json({ error: "unauthorized" }, 401);
    }
    // Kick off and return immediately: a full sync takes ~15 minutes, far
    // longer than any sane HTTP client will wait.
    queueMicrotask(() => {
      runDue(c.req.query("all") === "1").catch((e) => console.error(e));
    });
    return c.json({ started: true }, 202);
  });

  Bun.serve({ port: Number(process.env.PORT ?? 3000), fetch: app.fetch });
  console.log(`serving on :${process.env.PORT ?? 3000}`);
} else {
  // Default: one-shot for Railway cron. Exit non-zero on failure so the
  // scheduler reports it.
  const summary = await runDue(process.argv.includes("--all"));
  await sql.end();
  process.exit(summary.failed > 0 ? 1 : 0);
}
