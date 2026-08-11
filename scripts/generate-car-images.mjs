// One-off: generate mock vehicle photos for cars that have no images,
// upload them to MinIO, and create CarImage rows.
// Uses the same OpenRouter image API as ~/.claude/scripts/generate-image.mjs.
// Usage: node scripts/generate-car-images.mjs
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import sharp from "sharp";
import { allSizes, VARIANTS, variantKey } from "../src/lib/image-sizes.mjs";

process.loadEnvFile(".env");

const MODEL =
  process.env.OPENROUTER_IMAGE_MODEL || "google/gemini-3.1-flash-image-preview";
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
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const publicUrl = (key) =>
  `${endpoint.replace(/\/$/, "")}/${bucket}/${encodeURI(key)}`;

// Plausible color per car so all four shots of one vehicle match.
const COLORS = {
  "volkswagen-golf-viii": "moonstone grey metallic",
  "volkswagen-golf-vii": "tornado red",
  "volkswagen-passat": "reflex silver metallic",
  "volkswagen-tiguan": "atlantic blue metallic",
  "audi-a3": "daytona grey pearl",
  "audi-a4": "navarra blue metallic",
  "audi-q3": "glacier white metallic",
  "bmw-118": "alpine white",
  "bmw-320d": "mineral grey metallic",
  "bmw-x1": "sunset orange metallic",
  "bmw-x4": "carbon black metallic",
  "opel-mokka": "mamba green with white roof",
  "mercedes-benz-glb": "cosmos black metallic",
  "mercedes-benz-c-220": "polar white",
  "mercedes-benz-a-180": "mountain grey metallic",
  "skoda-octavia": "race blue metallic",
  "skoda-superb": "black magic pearl",
  "skoda-kodiaq": "quartz grey metallic",
  "ford-focus": "magnetic grey metallic",
  "renault-clio": "valencia orange with black roof",
};

const SHOTS = [
  {
    part: "front-3-4",
    text: "front three-quarter view, showing the front grille and driver side",
  },
  { part: "side", text: "direct side profile view" },
  {
    part: "rear-3-4",
    text: "rear three-quarter view, showing the tail lights and rear",
  },
  {
    part: "interior",
    text: "interior view of the dashboard, steering wheel and front seats through the open driver door",
  },
];

function colorFor(slug) {
  const key = Object.keys(COLORS).find((k) => slug.startsWith(k));
  return key ? COLORS[key] : "silver metallic";
}

function prompt(car, shot) {
  const year = car.firstRegistration.split("/")[1];
  return (
    `Professional car dealership listing photograph of a ${year} ${car.brand} ${car.model} ` +
    `(${car.title}), ${colorFor(car.slug)} paint, ${shot.text}. ` +
    `Parked on the clean paved forecourt of a modern German car dealership, softly overcast daylight, ` +
    `realistic reflections, sharp focus, no people, no text, no watermark, 3:2 landscape orientation. ` +
    `Photorealistic, shot on a full-frame DSLR.`
  );
}

async function generateImage(text) {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      modalities: ["image", "text"],
      messages: [{ role: "user", content: text }],
    }),
  });
  const data = await res.json();
  if (!res.ok)
    throw new Error(`OpenRouter ${res.status}: ${JSON.stringify(data).slice(0, 300)}`);
  const url = data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  const match = typeof url === "string" ? url.match(/^data:([^;]+);base64,(.+)$/s) : null;
  if (!match) throw new Error(`No image returned: ${JSON.stringify(data).slice(0, 300)}`);
  return { buffer: Buffer.from(match[2], "base64"), mimeType: match[1] };
}

async function withRetry(fn, label, tries = 3) {
  for (let i = 1; i <= tries; i++) {
    try {
      return await fn();
    } catch (err) {
      console.warn(`  retry ${i}/${tries} ${label}: ${err.message.slice(0, 120)}`);
      if (i === tries) throw err;
      await new Promise((r) => setTimeout(r, 2000 * i));
    }
  }
}

// Simple concurrency pool.
async function pool(items, limit, worker) {
  const results = [];
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        results[i] = await worker(items[i], i);
      }
    }),
  );
  return results;
}

const cars = await prisma.car.findMany({
  where: { images: { none: {} } },
  select: { id: true, slug: true, title: true, brand: true, model: true, firstRegistration: true },
});
console.log(`${cars.length} cars without images`);

const jobs = cars.flatMap((car) =>
  SHOTS.map((shot, order) => ({ car, shot, order })),
);

const results = await pool(jobs, 8, async ({ car, shot, order }) => {
  const label = `${car.slug.slice(0, 30)}/${shot.part}`;
  // mimeType is no longer read: sharp sniffs the format and everything is
  // re-encoded to JPEG below regardless of what the model returned.
  const { buffer } = await withRetry(() => generateImage(prompt(car, shot)), label);
  // The model hands back a PNG at whatever size it likes — often ~1.5 MB, which
  // stored as-is is ten times a real listing photo and skips the variants
  // entirely, so cards would pull the full thing. Normalize through the shared
  // sizes like every other write path.
  const key = `cars/${car.id}-${String(order + 1).padStart(2, "0")}-${shot.part}.jpg`;
  const base = sharp(buffer).rotate();
  let stored = 0;
  for (const s of allSizes(key)) {
    const out = await base
      .clone()
      .resize({ width: s.width, withoutEnlargement: true })
      .jpeg({ quality: s.quality, mozjpeg: true })
      .toBuffer();
    await s3.send(
      new PutObjectCommand({ Bucket: bucket, Key: s.key, Body: out, ContentType: "image/jpeg" }),
    );
    stored += out.length;
  }
  console.log(`✓ ${label} (${Math.round(buffer.length / 1024)} KB -> ${Math.round(stored / 1024)} KB)`);
  return { carId: car.id, key, order, alt: `${car.title} — ${shot.part}` };
});

// Insert CarImage rows grouped per car (first shot = primary).
for (const car of cars) {
  const rows = results
    .filter((r) => r && r.carId === car.id)
    .sort((a, b) => a.order - b.order);
  await prisma.carImage.createMany({
    // Point the rows at the variants too, or primaryImage() falls back to `url`
    // and every card downloads the full-size object.
    data: rows.map((r) => {
      const variants = Object.fromEntries(
        VARIANTS.flatMap((v) => [
          [`${v.name}Key`, variantKey(r.key, v.suffix)],
          [`${v.name}Url`, publicUrl(variantKey(r.key, v.suffix))],
        ]),
      );
      return {
        carId: car.id,
        url: publicUrl(r.key),
        key: r.key,
        alt: r.alt,
        sortOrder: r.order,
        isPrimary: r.order === 0,
        ...variants,
      };
    }),
  });
  console.log(`DB: ${rows.length} images for ${car.slug}`);
}

console.log("done");
await prisma.$disconnect();
