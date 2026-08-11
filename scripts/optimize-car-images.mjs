// Bring every object in the bucket down to the sizes the importer writes today:
// re-encode in place, under the same key, so no URL and no database row changes.
//
// Run it after changing FULL_WIDTH/FULL_QUALITY/VARIANTS in lib/car-import.mjs —
// those only affect NEW photos, and the bulk of the storage is what is already
// stored. Dropping the full size from 1600/q78 to 1280/q74 reclaims ~34% of the
// bucket, which is what pushed the MinIO volume over its limit on 2026-08-11.
//
// Source is the object already in MinIO, so this costs no Firecrawl credits and
// never touches mobile.de. Re-runnable: anything already at or below the target
// is left alone.
//
// REQUIRES FREE SPACE TO RUN. MinIO's minimum-free-drive threshold is a floor on
// the whole drive, not a per-write check, so once it trips it refuses even a
// write that replaces a 259 KB object with a 145 KB one. Deleting the original
// first does NOT get around it: one object is ~250 KB and the threshold is
// hundreds of MB away, so the rewrite is refused too and the photo is simply
// gone. Measured the hard way on 2026-08-11 — 20 objects deleted, 0 rewritten.
//
// On a full drive, free a few hundred MB of REGENERABLE data first: the -400 and
// -800 variants are derived from the full-size objects and
// scripts/backfill-image-variants.mjs rebuilds them from MinIO alone. Null their
// columns so the site falls back to `url` (see primaryImage in src/lib/cars.ts),
// run this, then re-run the backfill.
//
// Usage:
//   node scripts/optimize-car-images.mjs [--dry-run] [--concurrency 6]
//   node scripts/optimize-car-images.mjs --dry-run --sample 500   # estimate first
//
// --sample spreads its N objects across the whole bucket, which --limit does not:
// keys sort by listing id, so the first N objects are all the same few cars and
// their sizes say nothing about the rest.
import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import sharp from "sharp";
import { FULL_WIDTH, FULL_QUALITY, VARIANTS } from "./lib/car-import.mjs";
import { loadEnv, requireEnv } from "./lib/clients.mjs";

loadEnv();
requireEnv(["MINIO_ENDPOINT", "MINIO_ACCESS_KEY_ID", "MINIO_SECRET_ACCESS_KEY"]);

const args = process.argv.slice(2);
const flag = (name, fallback = null) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
const DRY = args.includes("--dry-run");
const CONCURRENCY = Number(flag("concurrency", 6));
const LIMIT = flag("limit") ? Number(flag("limit")) : Infinity;
const SAMPLE = flag("sample") ? Number(flag("sample")) : 0;

/** Bytes as MB below a gigabyte, or a partial run reports "0.00 GB reclaimed".
 *  Not named `size`: optimize() destructures an object's byte count as `size`,
 *  which would shadow it and turn the progress line into a TypeError. */
const fmtSize = (bytes) =>
  bytes >= 1e9 ? `${(bytes / 1e9).toFixed(2)} GB` : `${Math.round(bytes / 1e6)} MB`;

const endpoint = process.env.MINIO_ENDPOINT;
const bucket = process.env.MINIO_BUCKET || "kupiauto";
const s3 = new S3Client({
  region: process.env.MINIO_REGION || "us-east-1",
  endpoint,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY_ID,
    secretAccessKey: process.env.MINIO_SECRET_ACCESS_KEY,
  },
});

/** Each variant has its own target — re-encoding a 400px thumb at the full-size
 *  quality would make it BIGGER. Keyed off the suffix the importer writes. */
function targetFor(key) {
  for (const v of VARIANTS) {
    if (key.endsWith(`${v.suffix}.jpg`)) return { width: v.width, quality: v.quality };
  }
  return { width: FULL_WIDTH, quality: FULL_QUALITY };
}

async function listAll(prefix) {
  const objects = [];
  let token;
  do {
    const res = await s3.send(
      new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, ContinuationToken: token }),
    );
    objects.push(...(res.Contents ?? []).map((o) => ({ key: o.Key, size: o.Size ?? 0 })));
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
  return objects;
}

async function pool(items, limit, worker) {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) await worker(items[next++]);
    }),
  );
}

const stats = { rewritten: 0, skipped: 0, failed: 0, before: 0, after: 0 };

const isStorageFull = (err) =>
  err?.name === "XMinioStorageFull" ||
  /minimum free drive threshold|storage backend has reached/i.test(err?.message ?? "");

const put = (key, body) =>
  s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: "image/jpeg" }));

async function optimize({ key, size }) {
  const res = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const input = Buffer.from(await res.Body.transformToByteArray());
  const { width, quality } = targetFor(key);

  // No .rotate() here: these objects were written upright by the importer, which
  // applies EXIF orientation on the way in. Rotating again would turn any photo
  // whose orientation tag survived a second time.
  const out = await sharp(input)
    .resize({ width, withoutEnlargement: true })
    .jpeg({ quality, mozjpeg: true })
    .toBuffer();

  // Leaves already-optimized objects alone, which is what makes re-runs cheap —
  // and stops a marginal re-encode from costing a generation of quality for 2%.
  if (out.length >= size * 0.9) {
    stats.skipped++;
    stats.before += size;
    stats.after += size;
    return;
  }

  if (!DRY) await put(key, out);
  stats.rewritten++;
  stats.before += size;
  stats.after += out.length;
  if (stats.rewritten % 250 === 0) {
    console.log(
      `  ${stats.rewritten} rewritten, ${stats.skipped} already small enough, ` +
        `${fmtSize(stats.before - stats.after)} reclaimed so far`,
    );
  }
}

// --- main --------------------------------------------------------------------

const all = await listAll("cars/");
// Non-jpg objects are a handful of legacy hand-uploads; sharp would throw on
// anything that isn't an image and the variant keys assume .jpg.
const eligible = all.filter((o) => /\.jpg$/i.test(o.key));
// Full-size objects first. They are the only ones that shrink meaningfully —
// the 400/800 variants barely move and get skipped by the guard below — so on a
// full drive this is what frees space, and every one of them widens the margin
// for the rest. Keys interleave the three sizes per photo, so without this the
// run spends two thirds of its early passes on objects it will not rewrite.
const isFullSize = (o) => !VARIANTS.some((v) => o.key.endsWith(`${v.suffix}.jpg`));
const ordered = [...eligible].sort((a, b) => Number(isFullSize(b)) - Number(isFullSize(a)));
const objects = SAMPLE
  ? eligible.filter((_, i) => i % Math.max(1, Math.floor(eligible.length / SAMPLE)) === 0)
  : ordered.slice(0, LIMIT);

console.log(
  `${all.length} object(s) under cars/ (${fmtSize(all.reduce((a, o) => a + o.size, 0))}), ` +
    `${objects.length} to process${SAMPLE ? ` (sampled from ${eligible.length})` : ""}` +
    `${DRY ? " — dry run, nothing written" : ""}\n` +
    `targets: full ${FULL_WIDTH}px q${FULL_QUALITY}, ` +
    `${VARIANTS.map((v) => `${v.name} ${v.width}px q${v.quality}`).join(", ")}\n`,
);

let storageFull = false;

await pool(objects, CONCURRENCY, async (obj) => {
  if (storageFull) return;
  try {
    await optimize(obj);
  } catch (err) {
    // Nothing will succeed until space exists, and every further attempt is a
    // pointless GET plus a re-encode. Stop on the first one and say why.
    if (isStorageFull(err)) {
      if (!storageFull) {
        storageFull = true;
        console.error(
          `\n! MinIO is below its minimum free drive threshold and is refusing all\n` +
            `  writes, including the ones that would shrink the drive.\n` +
            `  Free a few hundred MB first — see the header of this file.\n`,
        );
      }
      return;
    }
    stats.failed++;
    console.error(`  ✗ ${obj.key.slice(5, 60)}: ${String(err.message).slice(0, 100)}`);
  }
});

const saved = stats.before - stats.after;
const pct = stats.before > 0 ? Math.round((saved / stats.before) * 100) : 0;
console.log(
  `\n${DRY ? "would reclaim" : "done"}: ${fmtSize(stats.before)} -> ${fmtSize(stats.after)} ` +
    `(${fmtSize(saved)}, ${pct}%)\n` +
    `${stats.rewritten} rewritten, ${stats.skipped} already small enough, ${stats.failed} failed`,
);
if (SAMPLE) {
  const bucketBytes = all.reduce((a, o) => a + o.size, 0);
  console.log(
    `extrapolated to the whole bucket: ${fmtSize(bucketBytes)} -> ${fmtSize(bucketBytes * (1 - pct / 100))}`,
  );
}
process.exit(stats.failed > 0 ? 1 : 0);
