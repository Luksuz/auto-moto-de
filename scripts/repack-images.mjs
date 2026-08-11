// Re-encode every stored photo to the sizes the importer writes today, using the
// local disk as a staging area.
//
// WHY NOT scripts/optimize-car-images.mjs: that one rewrites objects in place,
// which needs free space MinIO does not have — it refuses all writes once the
// drive is below its minimum free threshold, including the ones that would
// shrink it. Deleting an object first does not help: the threshold is a floor on
// the whole drive (hundreds of MB away), not a check against the pending write,
// so the rewrite is refused too and the photo is gone. That is not theory; it
// cost 20 photos on 2026-08-11.
//
// This script breaks that deadlock by never needing free space on the drive at
// the moment it writes. Reads work fine when full, and deletes always work, so:
// stage every photo locally first, then trade big objects for small ones in
// batches. The first batch frees far more than it writes, and every batch after
// it widens the margin.
//
// THE SAFETY RULE, and the reason the earlier attempt lost data: an object is
// deleted from MinIO only when its replacement already exists on local disk.
// Local files survive until the upload is verified, so a crash, a dropped
// connection or a closed laptop loses nothing — both phases resume.
//
// Phase 1 (prepare) mutates NOTHING. Run it, read the summary, then run push.
//
// Usage:
//   node scripts/repack-images.mjs --phase prepare
//   node scripts/repack-images.mjs --phase push [--batch 2000]
//   node scripts/repack-images.mjs --phase verify
import {
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectsCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { mkdir, writeFile, readFile, stat, appendFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import sharp from "sharp";
import { FULL_WIDTH, FULL_QUALITY, VARIANTS, variantKey } from "./lib/car-import.mjs";
import { createClients, loadEnv, requireEnv } from "./lib/clients.mjs";

loadEnv();
requireEnv(["DATABASE_URL", "MINIO_ENDPOINT", "MINIO_ACCESS_KEY_ID", "MINIO_SECRET_ACCESS_KEY"]);

const args = process.argv.slice(2);
const flag = (name, fallback = null) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
const PHASE = flag("phase", "prepare");
const BATCH = Number(flag("batch", 2000));
const CONCURRENCY = Number(flag("concurrency", 8));
const WORKDIR = flag("workdir", ".image-repack");
const LIMIT = flag("limit") ? Number(flag("limit")) : Infinity;

const { prisma, s3 } = createClients();
const bucket = process.env.MINIO_BUCKET || "kupiauto";

const ORIG = join(WORKDIR, "orig");
const OUT = join(WORKDIR, "out");
const MANIFEST = join(WORKDIR, "manifest.json");
const PUSHED = join(WORKDIR, "pushed.log");

const fmt = (b) => (b >= 1e9 ? `${(b / 1e9).toFixed(2)} GB` : `${Math.round(b / 1e6)} MB`);
const exists = (p) => stat(p).then((s) => s.size > 0).catch(() => false);

const isStorageFull = (err) =>
  err?.name === "XMinioStorageFull" ||
  /minimum free drive threshold|storage backend has reached/i.test(err?.message ?? "");

const put = (key, body) =>
  s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: "image/jpeg" }));

// The CDN path hash is the uuid in our own key, so a photo missing from MinIO is
// recoverable from source without a Firecrawl scrape or a listing re-read.
const CDN_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Referer: "https://suchen.mobile.de/",
};
function cdnUrlFor(key) {
  const m = key.match(/^cars\/md-\d+-([0-9a-f-]{36})\.jpg$/i);
  if (!m) return null;
  const uuid = m[1];
  return `https://img.classistatic.de/api/v1/mo-prod/images/${uuid.slice(0, 2)}/${uuid}?rule=mo-1600.jpg`;
}

async function pool(items, limit, worker) {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        try {
          await worker(items[i], i);
        } catch (err) {
          console.error(`  ✗ ${items[i].key}: ${String(err.message).slice(0, 110)}`);
        }
      }
    }),
  );
}

/** Every size for one photo, keyed exactly as the importer would write them. */
function outputsFor(key) {
  return [
    { key, width: FULL_WIDTH, quality: FULL_QUALITY },
    ...VARIANTS.map((v) => ({ key: variantKey(key, v.suffix), width: v.width, quality: v.quality })),
  ];
}

// --- phase 1: prepare (no mutations) ----------------------------------------

async function prepare() {
  const rows = await prisma.carImage.findMany({
    where: { key: { endsWith: ".jpg" } },
    select: { id: true, key: true },
    orderBy: { key: "asc" },
  });
  const photos = rows.slice(0, LIMIT);
  console.log(`${rows.length} photo(s) in the database, preparing ${photos.length}\n`);

  const stats = { downloaded: 0, fromCdn: 0, cached: 0, encoded: 0, unrecoverable: 0, srcBytes: 0, outBytes: 0 };
  const ready = [];
  const lost = [];

  await pool(photos, CONCURRENCY, async (photo) => {
    const origPath = join(ORIG, photo.key);
    const outputs = outputsFor(photo.key);

    // Resume: a photo whose outputs are all on disk is done.
    if ((await Promise.all(outputs.map((o) => exists(join(OUT, o.key))))).every(Boolean)) {
      stats.cached++;
      for (const o of outputs) stats.outBytes += (await stat(join(OUT, o.key))).size;
      ready.push(photo.key);
      return;
    }

    let input;
    let fromCdn = false;
    if (await exists(origPath)) {
      input = await readFile(origPath);
    } else {
      try {
        const res = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: photo.key }));
        input = Buffer.from(await res.Body.transformToByteArray());
        stats.downloaded++;
      } catch (err) {
        if (err.name !== "NoSuchKey" && err.$metadata?.httpStatusCode !== 404) throw err;
        // Gone from storage — fall back to the CDN it originally came from.
        const url = cdnUrlFor(photo.key);
        if (!url) {
          stats.unrecoverable++;
          lost.push(photo.key);
          return;
        }
        const res = await fetch(url, { headers: CDN_HEADERS });
        if (!res.ok) {
          stats.unrecoverable++;
          lost.push(photo.key);
          return;
        }
        input = Buffer.from(await res.arrayBuffer());
        fromCdn = true;
        stats.fromCdn++;
      }
      await mkdir(dirname(origPath), { recursive: true });
      await writeFile(origPath, input);
    }
    stats.srcBytes += input.length;

    // Objects already in MinIO were written upright by the importer, so rotating
    // again would turn any photo whose orientation tag survived a second time.
    // A photo just pulled from the CDN is raw and still needs it.
    const base = fromCdn ? sharp(input).rotate() : sharp(input);

    for (const o of outputs) {
      const buf = await base
        .clone()
        .resize({ width: o.width, withoutEnlargement: true })
        .jpeg({ quality: o.quality, mozjpeg: true })
        .toBuffer();
      const p = join(OUT, o.key);
      await mkdir(dirname(p), { recursive: true });
      await writeFile(p, buf);
      stats.outBytes += buf.length;
    }
    stats.encoded++;
    ready.push(photo.key);

    const done = stats.encoded + stats.cached;
    if (done % 500 === 0) console.log(`  ${done}/${photos.length} staged`);
  });

  await mkdir(WORKDIR, { recursive: true });
  await writeFile(MANIFEST, JSON.stringify({ keys: ready.sort() }, null, 0));

  console.log(
    `\nprepared ${ready.length} photo(s) into ${WORKDIR}/\n` +
      `  ${stats.downloaded} downloaded from MinIO, ${stats.fromCdn} re-fetched from the CDN, ` +
      `${stats.cached} already staged\n` +
      `  source ${fmt(stats.srcBytes)} -> repacked ${fmt(stats.outBytes)}`,
  );
  if (lost.length > 0) {
    console.log(`\n! ${lost.length} photo(s) could not be recovered from MinIO or the CDN:`);
    for (const k of lost.slice(0, 20)) console.log(`    ${k}`);
    console.log(`  their CarImage rows should be deleted — the site would serve 404s for them.`);
  }

  // What the push will actually do to the drive, before anyone touches it.
  const live = await bucketBytes();
  console.log(
    `\nbucket now ${fmt(live.bytes)} across ${live.count} object(s).\n` +
      `push would replace the staged photos with ${fmt(stats.outBytes)} of objects.`,
  );
  console.log(`\nNothing has been modified. Run --phase push when this looks right.`);
}

async function bucketBytes() {
  let token, count = 0, bytes = 0;
  do {
    const res = await s3.send(new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: token }));
    for (const o of res.Contents ?? []) { count++; bytes += o.Size ?? 0; }
    token = res.NextContinuationToken;
  } while (token);
  return { count, bytes };
}

// --- phase 2: push (deletes, then uploads, in batches) -----------------------

async function push() {
  const { keys } = JSON.parse(await readFile(MANIFEST, "utf8"));
  const already = new Set(
    (await readFile(PUSHED, "utf8").catch(() => "")).split("\n").filter(Boolean),
  );
  const todo = keys.filter((k) => !already.has(k));
  console.log(
    `${keys.length} staged, ${already.size} already pushed, ${todo.length} to go, ` +
      `batches of ${BATCH}\n`,
  );
  if (todo.length === 0) return;

  let freed = 0, written = 0;

  for (let i = 0; i < todo.length; i += BATCH) {
    const batch = todo.slice(i, i + BATCH);
    const groups = [];

    // THE SAFETY RULE: nothing is deleted unless its replacement is on disk.
    for (const key of batch) {
      const outputs = outputsFor(key);
      const present = await Promise.all(outputs.map((o) => exists(join(OUT, o.key))));
      if (present.every(Boolean)) groups.push({ key, outputs });
      else console.error(`  ✗ ${key}: staged files missing, skipping (re-run prepare)`);
    }
    if (groups.length === 0) continue;

    const objectKeys = groups.flatMap((g) => g.outputs.map((o) => o.key));

    // Try a plain overwrite first. It needs a little free space, so on a full
    // drive the first batch fails here and falls through to the bulk delete
    // below — but once that batch has traded ~570 MB of objects for ~380 MB,
    // every later batch overwrites in place and the photos are never absent
    // from the site at all. Adaptive rather than always-delete: no window we do
    // not have to open.
    let batchFreed = 0;
    let needsBulkDelete = false;
    try {
      await put(groups[0].outputs[0].key, await readFile(join(OUT, groups[0].outputs[0].key)));
    } catch (err) {
      if (!isStorageFull(err)) throw err;
      needsBulkDelete = true;
    }

    if (needsBulkDelete) {
      // Measure before removing, so the log states real numbers.
      const sizes = await Promise.all(
        objectKeys.map((k) =>
          s3.send(new HeadObjectCommand({ Bucket: bucket, Key: k }))
            .then((r) => r.ContentLength ?? 0)
            .catch(() => 0),
        ),
      );
      batchFreed = sizes.reduce((a, b) => a + b, 0);

      // Safe in a way the in-place script was not: every one of these objects
      // has its replacement sitting on local disk right now.
      for (let j = 0; j < objectKeys.length; j += 1000) {
        await s3.send(
          new DeleteObjectsCommand({
            Bucket: bucket,
            Delete: { Objects: objectKeys.slice(j, j + 1000).map((Key) => ({ Key })) },
          }),
        );
      }
      freed += batchFreed;
    }

    let batchWritten = 0;
    await pool(groups, CONCURRENCY, async (g) => {
      for (const o of g.outputs) {
        const body = await readFile(join(OUT, o.key));
        await put(o.key, body);
        batchWritten += body.length;
      }
      await appendFile(PUSHED, g.key + "\n");
    });
    written += batchWritten;

    console.log(
      `batch ${Math.floor(i / BATCH) + 1}: ${groups.length} photo(s), ` +
        (needsBulkDelete
          ? `drive was full — freed ${fmt(batchFreed)} first, `
          : `overwritten in place, `) +
        `wrote ${fmt(batchWritten)} (running net ${fmt(freed - written)})`,
    );
  }

  const live = await bucketBytes();
  console.log(
    `\ndone: freed ${fmt(freed)}, wrote ${fmt(written)}, net ${fmt(freed - written)} reclaimed\n` +
      `bucket now ${fmt(live.bytes)} across ${live.count} object(s)\n` +
      `local staging in ${WORKDIR}/ can be deleted once the site looks right`,
  );
}

// --- phase 3: verify ---------------------------------------------------------

async function verify() {
  const rows = await prisma.carImage.findMany({
    select: { key: true, thumbKey: true, mediumKey: true },
  });
  const keys = rows.flatMap((r) => [r.key, r.thumbKey, r.mediumKey].filter(Boolean));
  console.log(`checking ${keys.length} object(s) referenced by the database...`);

  const missing = [];
  await pool(
    keys.map((key) => ({ key })),
    16,
    async ({ key }) => {
      await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key })).catch(() => missing.push(key));
    },
  );

  const live = await bucketBytes();
  console.log(`\nbucket: ${fmt(live.bytes)} across ${live.count} object(s)`);
  console.log(`${missing.length} referenced object(s) missing from storage`);
  for (const k of missing.slice(0, 30)) console.log(`  ${k}`);
}

const phases = { prepare, push, verify };
if (!phases[PHASE]) {
  console.error(`unknown phase "${PHASE}" — expected prepare, push or verify`);
  process.exit(1);
}
await phases[PHASE]();
await prisma.$disconnect();
