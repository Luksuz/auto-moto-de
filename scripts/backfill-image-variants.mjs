// Backfill the 400px/800px variants for CarImage rows that predate them.
//
// Source is the full-size object ALREADY in MinIO, not mobile.de — so this costs
// no Firecrawl credits and works for hand-uploaded images too. Re-runnable: rows
// that already have variants are skipped.
//
// Needed because Vercel's image optimizer is switched off (next.config.ts) after
// a 1000-photo import exhausted the plan's per-source-image allowance and every
// image on the site started returning 402.
//
// Usage:
//   node scripts/backfill-image-variants.mjs [--limit N] [--concurrency 6] [--dry-run]
import { S3Client } from "@aws-sdk/client-s3";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { VARIANTS, variantKey } from "./lib/car-import.mjs";

process.loadEnvFile(".env");

const args = process.argv.slice(2);
const flag = (name, fallback = null) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
const DRY = args.includes("--dry-run");
const LIMIT = flag("limit") ? Number(flag("limit")) : undefined;
const CONCURRENCY = Number(flag("concurrency", 6));

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
const bucket = process.env.MINIO_BUCKET || "kupiauto";
const endpoint = process.env.MINIO_ENDPOINT;
const s3 = new S3Client({
  region: process.env.MINIO_REGION || "us-east-1",
  endpoint,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY_ID,
    secretAccessKey: process.env.MINIO_SECRET_ACCESS_KEY,
  },
});
const publicUrl = (key) => `${endpoint.replace(/\/$/, "")}/${bucket}/${encodeURI(key)}`;

async function pool(items, limit, worker) {
  const results = [];
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        results[i] = await worker(items[i], i).catch((err) => {
          console.error(`  ✗ ${items[i].key}: ${String(err.message).slice(0, 110)}`);
          return null;
        });
      }
    }),
  );
  return results;
}

async function backfill(img) {
  const res = await fetch(img.url);
  if (!res.ok) throw new Error(`source ${res.status}`);
  const input = Buffer.from(await res.arrayBuffer());
  // Already upright on disk — re-rotating would turn some photos twice.
  const base = sharp(input);

  const data = {};
  for (const v of VARIANTS) {
    const buf = await base
      .clone()
      .resize({ width: v.width, withoutEnlargement: true })
      .jpeg({ quality: v.quality, mozjpeg: true })
      .toBuffer();
    // Hand-uploaded images are .avif/.png, so derive the variant key from the
    // real extension rather than assuming .jpg.
    const vKey = /\.jpg$/i.test(img.key)
      ? variantKey(img.key, v.suffix)
      : img.key.replace(/\.[a-z0-9]+$/i, `${v.suffix}.jpg`);
    if (!DRY) {
      await s3.send(
        new PutObjectCommand({ Bucket: bucket, Key: vKey, Body: buf, ContentType: "image/jpeg" }),
      );
    }
    data[`${v.name}Url`] = publicUrl(vKey);
    data[`${v.name}Key`] = vKey;
  }

  if (!DRY) await prisma.carImage.update({ where: { id: img.id }, data });
  return data;
}

// --- main --------------------------------------------------------------------

const todo = await prisma.carImage.findMany({
  where: { OR: [{ thumbKey: null }, { mediumKey: null }] },
  select: { id: true, url: true, key: true },
  take: LIMIT,
  orderBy: { createdAt: "asc" },
});

const total = await prisma.carImage.count();
console.log(
  `${todo.length} of ${total} image(s) need variants` +
    `${DRY ? " (dry run — nothing written)" : ""}, concurrency ${CONCURRENCY}\n`,
);
if (todo.length === 0) {
  await prisma.$disconnect();
  process.exit(0);
}

let done = 0;
const results = await pool(todo, CONCURRENCY, async (img) => {
  const r = await backfill(img);
  if (++done % 50 === 0 || done === todo.length) console.log(`  ${done}/${todo.length}`);
  return r;
});

const ok = results.filter(Boolean).length;
console.log(`\ndone: ${ok} backfilled, ${results.length - ok} failed`);
if (!DRY) {
  console.log(`remaining without variants: ${await prisma.carImage.count({
    where: { OR: [{ thumbKey: null }, { mediumKey: null }] },
  })}`);
}

await prisma.$disconnect();
