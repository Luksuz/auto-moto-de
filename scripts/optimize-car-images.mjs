// One-off: optimize every car image in the MinIO bucket — resize to max
// 1600px wide, re-encode as mozjpeg q78, re-upload under the same key
// (URLs unchanged). Usage: node scripts/optimize-car-images.mjs
import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import sharp from "sharp";

process.loadEnvFile(".env");

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

async function listAll(prefix) {
  const keys = [];
  let token;
  do {
    const res = await s3.send(
      new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, ContinuationToken: token }),
    );
    keys.push(...(res.Contents ?? []).map((o) => ({ key: o.Key, size: o.Size })));
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
  return keys;
}

async function pool(items, limit, worker) {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) await worker(items[next++]);
    }),
  );
}

const objects = await listAll("cars/");
console.log(`${objects.length} objects under cars/`);

let totalBefore = 0;
let totalAfter = 0;
let skipped = 0;

await pool(objects, 6, async ({ key, size }) => {
  const res = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const input = Buffer.from(await res.Body.transformToByteArray());

  const out = await sharp(input)
    .rotate() // respect EXIF orientation
    .resize({ width: 1600, withoutEnlargement: true })
    .jpeg({ quality: 78, mozjpeg: true })
    .toBuffer();

  // Don't replace if optimization wouldn't meaningfully shrink the file
  // (also guards against re-running on already-optimized images).
  if (out.length >= size * 0.9) {
    skipped++;
    totalBefore += size;
    totalAfter += size;
    return;
  }

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: out,
      ContentType: "image/jpeg",
    }),
  );
  totalBefore += size;
  totalAfter += out.length;
  console.log(
    `✓ ${key.slice(5, 55)} ${Math.round(size / 1024)}KB → ${Math.round(out.length / 1024)}KB`,
  );
});

console.log(
  `done: ${Math.round(totalBefore / 1024 / 1024)}MB → ${Math.round(totalAfter / 1024 / 1024)}MB (${skipped} skipped)`,
);
