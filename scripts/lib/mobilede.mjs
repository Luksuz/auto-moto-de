// Shared mobile.de scraping core: Firecrawl fetches raw HTML, an LLM reads it.
//
// Used by scripts/extract-listing-urls.mjs, scripts/extract-listing-details.mjs
// and scripts/run-due-sources.mjs (the Railway cron worker) so there is exactly
// one implementation of the rules below rather than three that drift.
//
// Everything in here is pure scraping — no database, no S3. See car-import.mjs
// for the write side.
//
// Hard-won rules, each one a bug that cost real credits:
//
//   1. NO `location: {country: "DE"}` on Firecrawl requests. Its German egress
//      pool fails to tunnel to mobile.de and returns ERR_TUNNEL_CONNECTION_FAILED
//      on every attempt (measured 3/3 failures with it, 4/4 successes without).
//      The site serves German content regardless of egress.
//   2. `onlyMainContent` MUST be false on detail pages — with true they come back
//      as ~139 bytes of nothing. On dealer pages true "works" but strips the
//      customerId, which rule 3 needs.
//   3. Detail pages must use the home.mobile.de/home/vip?customerId=…&id=… form.
//      suchen.mobile.de/fahrzeuge/details.html?id=… renders ZERO gallery
//      thumbnails, and without thumbnail markup the image scrape falls back to a
//      blind sweep that also collects the dealer banner and photos of OTHER cars
//      from the recommendations carousel.
//   4. The LLM extracts, a regex audits. Ad ids the model returns are verified to
//      occur literally in the HTML; ids it missed are added back. Models
//      occasionally invent plausible 9-digit ids.
//   5. mobile.de splits the headline into "title" ("Audi Q5") and "subTitle"
//      ("40 TDI quattro sport/…"), and the <h1> holds the DEALER's name. Asking
//      for "the title" yields just the model, collapsing six BMWs onto one name.

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export class RateLimited extends Error {}

// --- Firecrawl ---------------------------------------------------------------

/** Firecrawl bills per minute, not per second: the starter plans allow ~10 scrape
 *  requests/min and answer everything beyond that with a 429. Requests go through
 *  one global gate rather than firing concurrently — bursting just converts
 *  credits into 429s. */
export function createFirecrawl({ apiKey, rpm = 10, log = () => {} }) {
  const minInterval = Math.ceil(60000 / Math.max(1, rpm));
  let nextSlot = 0;

  async function gate() {
    const now = Date.now();
    const wait = Math.max(0, nextSlot - now);
    nextSlot = Math.max(now, nextSlot) + minInterval;
    if (wait > 0) await sleep(wait);
  }

  async function once(url) {
    await gate();
    const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        url,
        formats: ["rawHtml"],
        onlyMainContent: false, // rule 2
        maxAge: 0,
        timeout: 90000,
        // rule 1: no `location` field.
      }),
    });
    const json = await res.json().catch(() => ({}));

    if (res.status === 429) {
      const retryAfter =
        Number(res.headers.get("retry-after")) ||
        Number(String(json.error ?? "").match(/retry after (\d+)s/i)?.[1]) ||
        30;
      // Push every queued request past the reset, not just this one.
      nextSlot = Math.max(nextSlot, Date.now() + (retryAfter + 2) * 1000);
      throw new RateLimited(`rate limited, waiting ${retryAfter}s`);
    }
    if (!res.ok || !json.success) {
      throw new Error(`firecrawl ${res.status}: ${JSON.stringify(json).slice(0, 160)}`);
    }
    return json.data?.rawHtml ?? "";
  }

  /** A 429 means "too fast", not "broken", so it does not consume the attempt
   *  budget. Transient site errors do — but they are common enough on mobile.de
   *  that a short budget gives up on pages that load fine seconds later, so the
   *  budget is deliberately generous. */
  return async function fetchHtml(url, { tries = 6 } = {}) {
    let waits = 0;
    for (let i = 1; ; i++) {
      try {
        return await once(url);
      } catch (err) {
        if (err instanceof RateLimited && ++waits <= 10) {
          log(`  ${err.message}`);
          i--;
          continue;
        }
        if (i >= tries) throw err;
        log(`  retry ${i}/${tries}: ${String(err.message).slice(0, 110)}`);
        await sleep(4000 * i);
      }
    }
  };
}

// --- OpenRouter --------------------------------------------------------------

export function createModel({ apiKey, model, log = () => {} }) {
  const TRIES = 5;

  return async function extract(html, { schema, prompt, name, label = "" }) {
    for (let attempt = 1; ; attempt++) {
      let res;
      try {
        res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            temperature: 0,
            messages: [
              { role: "system", content: prompt },
              { role: "user", content: html },
            ],
            response_format: { type: "json_schema", json_schema: { name, strict: true, schema } },
          }),
        });
      } catch (err) {
        // A dropped connection ("fetch failed", ECONNRESET, ETIMEDOUT) throws
        // instead of returning a response, so without this it skipped the retry
        // path entirely and killed the whole source. On a multi-hour run a
        // momentary blip must not cost the entire dealer.
        if (attempt >= TRIES) {
          throw new Error(`${label}: network error after ${TRIES} tries: ${String(err?.message ?? err).slice(0, 90)}`);
        }
        log(`  retry ${attempt}/${TRIES} model ${label} (network: ${String(err?.message ?? err).slice(0, 60)})`);
        await sleep(3000 * attempt);
        continue;
      }
      const json = await res.json().catch(() => ({}));

      if (res.ok && !json.error) {
        const content = json.choices?.[0]?.message?.content ?? "";
        try {
          return { data: JSON.parse(content), usage: json.usage ?? {} };
        } catch {
          if (attempt >= TRIES) throw new Error(`${label}: model returned non-JSON: ${content.slice(0, 140)}`);
        }
      } else if (attempt >= TRIES || (res.status < 500 && res.status !== 429)) {
        throw new Error(`${label}: openrouter ${res.status}: ${JSON.stringify(json).slice(0, 180)}`);
      }

      log(`  retry ${attempt}/${TRIES} model ${label} (http ${res.status})`);
      await sleep(3000 * attempt);
    }
  };
}

// --- HTML helpers ------------------------------------------------------------

/** Drop everything that costs tokens but carries no listing data. A dealer page is
 *  ~620 KB raw and most of the difference is inline JS. */
export function clean(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style|noscript|svg|iframe)\b[\s\S]*?<\/\1>/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Split on tag boundaries so a chunk never ends mid-attribute, which would hide
 *  an `adId=` from the model. */
export function chunk(text, size) {
  if (text.length <= size) return [text];
  const parts = [];
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

/** Ground truth for rule 4. */
export function idsFromHtml(html) {
  const ids = new Set();
  for (const m of html.matchAll(/\badId=(\d+)/g)) ids.add(m[1]);
  for (const m of html.matchAll(/details\.html\?[^"'\s]*\bid=(\d+)/g)) ids.add(m[1]);
  return ids;
}

/** Only present in the FULL page HTML — onlyMainContent:true strips it. */
export function customerIdFromHtml(html) {
  const hits = new Set([...html.matchAll(/customerId["'=:\\\s]{1,4}(\d{5,})/gi)].map((m) => m[1]));
  return hits.size === 1 ? [...hits][0] : null;
}

export function pageIndicator(html) {
  const m = html.match(/mobile-page-indicator[^>]*>\s*(\d+)\s*\/\s*(\d+)\s*</);
  return m ? { page: Number(m[1]), total: Number(m[2]) } : null;
}

/** "34 Pkw von 36 Angeboten" — the dealer's own count of CARS, which is the right
 *  target. The larger number includes non-Pkw offers the car filter excludes. */
export function reportedCarCount(html) {
  const m = html.match(/(\d+)\s*Pkw\s+von\s+(\d+)\s*Angeboten/i);
  return m ? { cars: Number(m[1]), offers: Number(m[2]) } : null;
}

export const vipUrl = (id, customerId) =>
  `https://home.mobile.de/home/vip?vc=Car&customerId=${customerId}&id=${id}`;
export const searchUrl = (id) => `https://suchen.mobile.de/fahrzeuge/details.html?id=${id}`;
export const detailUrl = (id, customerId) => (customerId ? vipUrl(id, customerId) : searchUrl(id));

export function withPageNumber(url, page) {
  const u = new URL(url);
  u.searchParams.set("pageNumber", String(page));
  return u.href;
}

// --- images (rule 3) ---------------------------------------------------------

/** Image identity on the CDN is the path hash; `rule=` only selects a rendered
 *  size, so normalize every URL to the largest variant. */
export function normalizeImageUrl(raw) {
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

// The gallery renders one <div data-testid="thumbnail-N"> per photo, each wrapping
// an <img>. N runs 0..count-1 and matches the "1/28" counter on the page exactly.
const THUMB_RE =
  /data-testid=["']thumbnail-(\d+)["'][\s\S]{0,800}?<img[^>]+src=["'](https:\/\/img\.classistatic\.de[^"']+)["']/gi;
const CDN_RE = /https?:\/\/img\.classistatic\.de\/[^"'\s\\)]+/gi;

/** A blind sweep of every classistatic URL over-collects badly: it picks up the
 *  dealer banner, the logo and — worse — photos of OTHER cars in the
 *  recommendations carousel, which no aspect-ratio or document-order heuristic
 *  separates. So key off the gallery's own thumbnail markup, and flag (never
 *  silently trust) the fallback. */
export function extractImages(html) {
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
 *  images.length; if it doesn't, the gallery was only partly rendered. */
export function renderedThumbCount(html) {
  const idx = [...html.matchAll(/data-testid=["']thumbnail-(\d+)["']/gi)].map((m) => Number(m[1]));
  return idx.length > 0 ? Math.max(...idx) + 1 : null;
}

// --- description -------------------------------------------------------------

/** Strip the selling dealer's own contact details from a description.
 *
 *  This runs AFTER the model has parsed the text — it decides nothing about
 *  structure, it only enforces a publishing rule the prompt asks for but cannot
 *  guarantee. Measured: the model kept "Mehr Fahrzeuge auf www.autohaus-kucur.com"
 *  and "Öffnungszeiten: Mo-Fr 10:00 - 18:00" in 2 of 3 sample listings despite
 *  being told to drop them. Publishing a competitor's website and opening hours
 *  on the client's own car page is not something to leave to chance.
 */
export function scrubDealerContact(text) {
  if (!text) return text;

  let out = text;

  // Remove the whole clause around a URL/email/phone, not just the token, so no
  // dangling "Mehr Fahrzeuge auf" is left behind.
  const CLAUSE = (inner) => new RegExp(`[^.!?\\n•]*${inner}[^.!?\\n]*[.!?]?`, "gi");
  out = out.replace(CLAUSE("(?:https?:\\/\\/|www\\.)\\S+"), "");
  out = out.replace(CLAUSE("[\\w.+-]+@[\\w-]+\\.[\\w.]+"), "");
  out = out.replace(CLAUSE("(?:tel\\.?|telefon|mobil|handy|fax)\\s*:?\\s*[+\\d][\\d\\s()/-]{6,}"), "");

  // Opening hours / directions run to the end of whatever block they start in,
  // and may sit mid-line after other content worth keeping.
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

/** Flatten the model's structured description into the plain-text convention the
 *  site renders (see src/components/car/car-description.tsx): a heading on its
 *  own line, one "• item" per feature, a blank line between blocks.
 *
 *  Storage stays a plain string so the description remains editable as a textarea
 *  in the admin panel — this only serializes what the model already separated, it
 *  does not decide what a heading or an item is. */
export function blocksToText(blocks) {
  if (!Array.isArray(blocks)) return null;

  const out = [];
  for (const block of blocks) {
    const heading = String(block?.heading ?? "").trim();
    const paragraph = String(block?.paragraph ?? "").trim();
    const items = Array.isArray(block?.items)
      ? block.items.map((i) => String(i).trim()).filter(Boolean)
      : [];

    if (!heading && !paragraph && items.length === 0) continue;
    if (out.length > 0) out.push("");
    if (heading) out.push(heading.replace(/:+$/, "") + ":");
    if (paragraph) out.push(paragraph);
    for (const item of items) out.push(`• ${item}`);
  }

  const text = out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  return text.length >= 15 ? text : null;
}

// --- schemas -----------------------------------------------------------------

export const LISTINGS_SCHEMA = {
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
              "financing rate ('Finanzierung ab 216 € mtl.'). null if absent.",
          },
        },
      },
    },
  },
};

export const LISTINGS_PROMPT = `Du bekommst den HTML-Code einer Händlerseite von mobile.de.

Liste JEDES Fahrzeug auf, das dieser Händler auf dieser Seite anbietet.

- Die Anzeigen-ID steht in Links als "adId=123456789" oder "details.html?id=123456789".
  Gib nur die Ziffern zurück.
- Jedes Fahrzeug genau einmal. Titel erscheinen im Markup oft doppelt — das ist EIN Fahrzeug.
- Ignoriere Werbung, Fahrzeugempfehlungen anderer Händler und Navigationslinks.
- Erfinde keine IDs. Gib nur IDs zurück, die wörtlich im HTML stehen.`;

// Enum members must match prisma/schema.prisma exactly — car-import.mjs writes
// these straight into Postgres.
export const FUEL = ["DIESEL", "BENZIN", "HYBRID", "ELEKTRICNI", "PLIN"];
export const TRANSMISSION = ["AUTOMATSKI", "MANUALNI"];
export const BODY = [
  "LIMUZINA", "KARAVAN", "SUV", "MONOVOLUMEN", "MALI_AUTO",
  "COUPE", "KABRIOLET", "TERENAC", "PICKUP",
];

const nullable = (type, extra = {}) => ({ type: [type, "null"], ...extra });
const nullableEnum = (values, description) => ({
  type: ["string", "null"],
  enum: [...values, null],
  description,
});

// Every field is nullable AND required: strict json_schema forbids absent keys, so
// "not on the page" is expressed as null.
const CAR_PROPS = {
  is_car_listing: {
    type: "boolean",
    description: "false if this page is not a single vehicle listing (error page, search results, …)",
  },
  // rule 5
  title: nullable("string", {
    description:
      "The COMPLETE advert headline: the short model name AND the variant/subtitle line " +
      "joined into one string, e.g. 'Audi Q5 40 TDI quattro sport/Anhänger/LED/Tempomat', " +
      "not just 'Audi Q5'. The same full string appears as the alt text of the gallery " +
      "photos. Without the price.",
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
  power_kw: nullable("number", { description: "kW value from Leistung, e.g. 130" }),
  power_ks: nullable("number", { description: "PS value from Leistung, e.g. 177" }),
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
      "The HU/TÜV expiry DATE as MM/YYYY, e.g. '02/2027'. null if only the label 'HU' appears " +
      "with no date — never return 'HU' as the value.",
  }),
  emission_class: nullable("string", { description: "Schadstoffklasse, e.g. 'Euro 6'" }),
  previous_owners: nullable("number", { description: "Anzahl der Fahrzeughalter" }),
  equipment: {
    type: "array",
    items: { type: "string" },
    description: "Every entry from Ausstattung/Komfort/Sicherheit/Extras, one string each",
  },
  // Structured rather than free text: the seller's Fahrzeugbeschreibung is
  // usually a heading followed by dozens of features, and every separator style
  // shows up across dealers ("a, b, c", "a / b / c", "-a" per line). Splitting
  // that in code needs a list of German abbreviations that can never be
  // complete, so the model — which reads the markup and the language — decides
  // what is a heading, what is prose and where one feature ends.
  description_blocks: {
    type: "array",
    description:
      "The seller's Fahrzeugbeschreibung, split into blocks in the order they appear.",
    items: {
      type: "object",
      additionalProperties: false,
      required: ["heading", "paragraph", "items"],
      properties: {
        heading: {
          type: ["string", "null"],
          description:
            "Heading introducing this block, e.g. 'Sonderausstattung' or 'Weitere Ausstattung', " +
            "without the trailing colon. null when the block has no heading.",
        },
        paragraph: {
          type: ["string", "null"],
          description:
            "Running prose of this block, verbatim in German (condition, history, financing " +
            "notes). null when this block is a feature list.",
        },
        items: {
          type: "array",
          items: { type: "string" },
          description:
            "One entry per individual feature, verbatim. Split however the seller separated " +
            "them — commas, slashes or line breaks. Never merge two features into one entry " +
            "and never split a single feature that happens to contain a slash, such as " +
            "'Airbag Fahrer-/Beifahrerseite'. Empty array when the block is prose.",
        },
      },
    },
  },
  warranty: nullable("string", { description: "Garantie/Gewährleistung note if present" }),
};

export const CAR_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: Object.keys(CAR_PROPS),
  properties: CAR_PROPS,
};

export const CAR_PROMPT = `Extrahiere die Fahrzeugdaten aus diesem mobile.de-Inserat (HTML).

Behalte ALLE Texte im deutschen Original — übersetze nichts.

Erfinde nichts: steht ein Wert nicht auf der Seite, gib null zurück, statt zu raten
oder die Feldbezeichnung als Wert zurückzugeben. Nimm ausschließlich Daten dieses einen
Fahrzeugs, nicht aus Fahrzeugempfehlungen, Werbung oder Händler-Kontaktdaten.

Fahrzeugbeschreibung (description_blocks):
- Gib die Beschreibung des Verkäufers in der Reihenfolge wieder, in der sie auf der Seite steht.
- Eine Überschrift wie "Sonderausstattung:" beginnt einen neuen Block.
- Ausstattungslisten gehören nach "items", ein Eintrag pro Merkmal — egal ob der Verkäufer mit
  Komma, Schrägstrich oder Zeilenumbruch trennt. Fasse niemals zwei Merkmale zusammen und zerlege
  kein Merkmal, das selbst einen Schrägstrich enthält (z. B. "Airbag Fahrer-/Beifahrerseite").
- Fließtext (Zustand, Historie, Finanzierungshinweise) gehört unverändert nach "paragraph".
- Lass Kontaktdaten, Adressen, Öffnungszeiten und Anfahrtsbeschreibungen des Händlers komplett weg.

Beachte für jedes Feld die Beschreibung im Schema.`;

/** The schema constrains the model, but a schema is a request, not a guarantee —
 *  and the importer writes enums straight into Postgres. Anything outside the
 *  allowed set becomes null and is reported rather than written. */
export function sanitize(car, warn = () => {}) {
  const enums = {
    fuel_type: FUEL,
    transmission: TRANSMISSION,
    body_type: BODY,
  };
  for (const [field, allowed] of Object.entries(enums)) {
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
  car.equipment = [...new Set(car.equipment.map((e) => String(e).trim()).filter(Boolean))];
  return car;
}

// --- stage 1: dealer page -> listings ---------------------------------------

/** rule 4: the model is the extractor, the regex is the auditor. */
export function reconcile(fromModel, truth, customerId) {
  const kept = new Map();
  let invented = 0;

  for (const l of fromModel) {
    const id = String(l.ad_id ?? "").replace(/\D/g, "");
    if (!id) continue;
    if (!truth.has(id)) {
      invented++;
      continue;
    }
    if (!kept.has(id)) {
      kept.set(id, {
        adId: id,
        url: detailUrl(id, customerId),
        title: l.title ?? null,
        priceEur: l.price_eur ?? null,
      });
    }
  }

  const missed = [...truth].filter((id) => !kept.has(id));
  for (const id of missed) {
    kept.set(id, { adId: id, url: detailUrl(id, customerId), title: null, priceEur: null });
  }

  return { listings: [...kept.values()], invented, missed };
}

/** Walk a dealer's result pages and return every car listing on them.
 *
 *  Paging is done with ?pageNumber= because mobile.de's next/prev controls are
 *  <button>s with no href — there is nothing to follow. */
export async function discoverListings({
  dealerUrl,
  fetchHtml,
  extract,
  maxPages = 25,
  chunkChars = 400_000,
  log = () => {},
}) {
  const truth = new Set();
  const fromModel = [];
  let customerId = null;
  let reported = null;
  let pagesRead = 0;
  const usage = { prompt: 0, completion: 0 };

  for (let page = 1; page <= maxPages; page++) {
    const url = page === 1 ? dealerUrl : withPageNumber(dealerUrl, page);
    const html = await fetchHtml(url);
    pagesRead++;

    const indicator = pageIndicator(html);
    // Past the last page mobile.de returns an empty list with an out-of-range
    // indicator (e.g. "3/2"). That is the end, not a block.
    if (indicator && indicator.page > indicator.total) {
      log(`page ${page}: past the last page (${indicator.page}/${indicator.total})`);
      break;
    }

    customerId ??= customerIdFromHtml(html);
    reported ??= reportedCarCount(html);

    const idsHere = idsFromHtml(html);
    const before = truth.size;
    for (const id of idsHere) truth.add(id);

    for (const part of chunk(clean(html), chunkChars)) {
      const { data, usage: u } = await extract(part, {
        schema: LISTINGS_SCHEMA,
        prompt: LISTINGS_PROMPT,
        name: "dealer_listings",
        label: `page ${page}`,
      });
      fromModel.push(...(data.listings ?? []));
      usage.prompt += u.prompt_tokens ?? 0;
      usage.completion += u.completion_tokens ?? 0;
    }

    const fresh = truth.size - before;
    log(`page ${page}: ${idsHere.size} listings (${fresh} new, ${truth.size} total)`);
    if (fresh === 0) break;
  }

  const { listings, invented, missed } = reconcile(fromModel, truth, customerId);
  return { listings, customerId, reported, pagesRead, invented, missed, usage };
}

// --- stage 2: detail page -> vehicle record ----------------------------------

/** Turn one fetched detail page into the record shape car-import.mjs consumes.
 *
 *  `preferredTitle` should be the headline discovery read off the dealer's own
 *  results page. Prefer it: the detail page stores the headline as title +
 *  subTitle, and for some brands the two OVERLAP, so joining them duplicates a
 *  word — "Hyundai TUCSON" + "Tucson Pure 2WD" becomes "Hyundai TUCSON Tucson
 *  Pure 2WD", and "MINI Cooper" + "John Cooper Works" becomes "MINI Cooper John
 *  Cooper Works". The dealer page carries the advert headline as one clean
 *  string ("Hyundai Tucson Pure 2WD", "MINI John Cooper Works"), which is both
 *  correct and what the seller actually wrote. The detail page stays the
 *  fallback for listings discovery only recovered by ad id. */
export async function extractDetail({
  html,
  url,
  adId,
  extract,
  preferredTitle = null,
  log = () => {},
}) {
  if (html.length < 5000) throw new Error(`empty page (${html.length} bytes)`);

  const warnings = [];
  const { data: car, usage } = await extract(clean(html), {
    schema: CAR_SCHEMA,
    prompt: CAR_PROMPT,
    name: "vehicle",
    label: adId,
  });

  if (car.is_car_listing === false) throw new Error("not a vehicle listing");

  const fromPage = String(preferredTitle ?? "").trim();
  if (fromPage) car.title = fromPage;

  // The model already separated headings, prose and individual features; this
  // only flattens them into the stored text format.
  car.description = scrubDealerContact(blocksToText(car.description_blocks));
  delete car.description_blocks;
  sanitize(car, (w) => {
    warnings.push(w);
    log(`      ! ${w}`);
  });

  const { source, images } = extractImages(html);
  return {
    listing: {
      url,
      listingId: adId,
      scrapedAt: new Date().toISOString(),
      extracted: car,
      imagesSource: source,
      thumbCount: renderedThumbCount(html),
      images,
    },
    warnings,
    usage,
  };
}
