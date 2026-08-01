// Extract mobile.de listing URLs from saved dealer HTML using an LLM
// (OpenRouter, structured JSON output).
//
// Offline counterpart to the discovery stage in scripts/run-due-sources.mjs: this
// one reads HTML already on disk instead of fetching it, which makes it the cheap
// way to iterate on the prompt. The extraction rules themselves live in
// scripts/lib/mobilede.mjs so both paths behave identically.
//
// Input is whatever a Firecrawl `formats: ["rawHtml"]` call saved. Fetch dealer
// pages with onlyMainContent:false — with true the customerId is stripped, and
// without customerId the emitted detail URLs fall back to details.html, whose
// photo galleries do not render.
//
// Usage:
//   node scripts/extract-listing-urls.mjs mobilede-home.html mobilede-home-p2.html
//   node scripts/extract-listing-urls.mjs *.html --out listing-urls.json --model openai/gpt-5-mini
import { readFileSync, writeFileSync } from "node:fs";
import {
  chunk,
  clean,
  createModel,
  customerIdFromHtml,
  detailUrl,
  idsFromHtml,
  LISTINGS_PROMPT,
  LISTINGS_SCHEMA,
  reconcile,
  reportedCarCount,
} from "./lib/mobilede.mjs";

process.loadEnvFile(".env");

const args = process.argv.slice(2);
const flag = (name, fallback = null) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};

const files = args.filter((a) => a.endsWith(".html"));
const OUT = flag("out", "listing-urls.json");
const MODEL = flag("model", process.env.OPENROUTER_EXTRACT_MODEL || "google/gemini-3.1-flash-lite");
// ~4 chars/token, so 400k chars is ~100k tokens — comfortable for a 1M-context
// model, and an extra chunk is cheaper than a truncated page.
const CHUNK_CHARS = Number(flag("chunk-chars", 400_000));

if (files.length === 0) {
  console.error("usage: node scripts/extract-listing-urls.mjs <page.html…> [--out f.json] [--model id]");
  process.exit(1);
}
if (!process.env.OPENROUTER_API_KEY) {
  console.error("OPENROUTER_API_KEY missing from .env");
  process.exit(1);
}

const extract = createModel({
  apiKey: process.env.OPENROUTER_API_KEY,
  model: MODEL,
  log: (m) => console.warn(m),
});

// --- main --------------------------------------------------------------------

const truth = new Set();
const chunks = [];
let customerId = flag("customer-id");
let reported = null;

for (const file of files) {
  const raw = readFileSync(file, "utf8");
  for (const id of idsFromHtml(raw)) truth.add(id);
  customerId ??= customerIdFromHtml(raw);
  reported ??= reportedCarCount(raw);
  const cleaned = clean(raw);
  const parts = chunk(cleaned, CHUNK_CHARS);
  parts.forEach((p, i) => chunks.push({ text: p, label: parts.length > 1 ? `${file}#${i + 1}` : file }));
  console.log(`${file}: ${raw.length} B -> ${cleaned.length} B cleaned, ${parts.length} chunk(s)`);
}

console.log(`model: ${MODEL}`);
console.log(
  customerId
    ? `customerId: ${customerId} — emitting home.mobile.de/home/vip URLs (gallery renders)\n`
    : `! no customerId in this HTML (scrape the dealer page with onlyMainContent:false, or pass\n` +
        `  --customer-id N). Falling back to details.html URLs, whose galleries do NOT render.\n`,
);

const fromModel = [];
let promptTokens = 0;
let completionTokens = 0;
for (const c of chunks) {
  const { data, usage } = await extract(c.text, {
    schema: LISTINGS_SCHEMA,
    prompt: LISTINGS_PROMPT,
    name: "dealer_listings",
    label: c.label,
  });
  promptTokens += usage.prompt_tokens ?? 0;
  completionTokens += usage.completion_tokens ?? 0;
  console.log(`  ${c.label}: ${(data.listings ?? []).length} listing(s)`);
  fromModel.push(...(data.listings ?? []));
}

const { listings, invented, missed } = reconcile(fromModel, truth, customerId);
listings.sort((a, b) => (a.title ?? "￿").localeCompare(b.title ?? "￿", "de"));

writeFileSync(
  OUT,
  JSON.stringify({ sources: files, model: MODEL, customerId, count: listings.length, listings }, null, 2),
);

console.log(`\n${listings.length} listings -> ${OUT}`);
console.log(`tokens: ${promptTokens} in / ${completionTokens} out`);
for (const l of listings) {
  console.log(
    `  ${l.adId}  ${String(l.title ?? "(no title from model)").slice(0, 52).padEnd(52)} ` +
      `${l.priceEur ?? "?"} EUR`,
  );
}
if (reported && listings.length !== reported.cars) {
  console.warn(`\n! page reports ${reported.cars} cars (of ${reported.offers} offers), found ${listings.length}`);
}
if (invented > 0) console.warn(`\n! dropped ${invented} id(s) the model returned that are not in the HTML`);
if (missed.length > 0) {
  console.warn(
    `\n! the model missed ${missed.length} id(s) the HTML contains; added with a null title:\n    ` +
      missed.join(" "),
  );
}
console.log(`\nnext: node scripts/extract-listing-details.mjs ${OUT}`);
