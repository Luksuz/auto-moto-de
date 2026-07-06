// Import Facebook feed posts scraped with scripts/fb-feed-scraper.console.js:
// each post's text goes through an LLM (structured extraction), its images
// are downloaded from the FB CDN, optimized and uploaded to MinIO, and a
// published Car (+CarImage rows, equipment, description) is created — all
// posts processed in parallel. Idempotent: existing slugs are skipped.
//
// Usage: node scripts/import-fb-feed.mjs [path/to/fb-feed.json]
import { readFileSync } from "node:fs";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import sharp from "sharp";

process.loadEnvFile(".env");

const FILE = process.argv[2] || "fb-feed.json";
const CUTOFF = new Date("2026-06-01T00:00:00");
const MODEL = process.env.OPENROUTER_EXTRACT_MODEL || "google/gemini-3.1-flash-lite";

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
const publicUrl = (key) => `${endpoint.replace(/\/$/, "")}/${bucket}/${encodeURI(key)}`;

function slugify(input) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 80);
}

const EXTRACT_PROMPT = `Ti si asistent za unos vozila u bazu autokuće AUTOCAR EU. Iz teksta Facebook objave izvuci strukturirane podatke o vozilu.

Vrati ISKLJUČIVO validan JSON (bez markdown ograda) točno ovog oblika:
{
  "is_car_listing": boolean,          // false ako objava nije oglas za vozilo
  "title": string,                    // čisti naziv vozila bez emojija, npr. "Škoda Karoq Drive 125 4x4"
  "brand": string,                    // npr. "Škoda", "BMW", "Mercedes-Benz", "Volkswagen"
  "model": string,                    // npr. "Karoq", "320", "GLB"
  "price_eur": number | null,         // cijena u EUR, samo broj
  "first_registration": string|null,  // "MM/YYYY", npr. "01/2021"; ako je samo godina, "01/YYYY"
  "mileage_km": number | null,
  "fuel_type": "DIESEL"|"BENZIN"|"HYBRID"|"ELEKTRICNI"|"PLIN"|null,
  "transmission": "AUTOMATSKI"|"MANUALNI"|null,
  "power_kw": number | null,
  "power_ks": number | null,
  "body_type": "LIMUZINA"|"KARAVAN"|"SUV"|"MONOVOLUMEN"|"MALI_AUTO"|"COUPE"|"KABRIOLET"|"TERENAC"|"PICKUP"|null,
  "previous_owners": number | null,   // npr. "2. Hand" => 2
  "emission_class": string | null,    // npr. "Euro 6"
  "equipment": string[],              // SVE stavke opreme iz objave, prevedene na hrvatski, bez emojija
  "description_hr": string,           // 2-3 rečenice prodajnog opisa na hrvatskom, sastavljeno iz objave, bez emojija i kontakata
  "warranty": string | null           // napomena o garanciji ako se spominje, na hrvatskom
}

Njemačke izraze prevedi na hrvatski (npr. "Sitzheizung" -> "Grijana sjedala", "Erstzulassung" -> prva registracija). Ne izmišljaj podatke kojih nema u tekstu.

TEKST OBJAVE:
`;

async function extract(text) {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "user", content: EXTRACT_PROMPT + text }],
      temperature: 0,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${JSON.stringify(data).slice(0, 200)}`);
  const raw = data.choices?.[0]?.message?.content ?? "";
  const json = raw.replace(/^```(json)?\s*/i, "").replace(/```\s*$/, "").trim();
  return JSON.parse(json);
}

async function importImage(url, key) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`image ${res.status}`);
  const input = Buffer.from(await res.arrayBuffer());
  const out = await sharp(input)
    .rotate()
    .resize({ width: 1600, withoutEnlargement: true })
    .jpeg({ quality: 78, mozjpeg: true })
    .toBuffer();
  await s3.send(
    new PutObjectCommand({ Bucket: bucket, Key: key, Body: out, ContentType: "image/jpeg" }),
  );
  return publicUrl(key);
}

async function withRetry(fn, label, tries = 3) {
  for (let i = 1; i <= tries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === tries) throw err;
      console.warn(`  retry ${i}/${tries} ${label}: ${String(err.message).slice(0, 100)}`);
      await new Promise((r) => setTimeout(r, 1500 * i));
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
          console.error(`✗ item ${i}: ${String(err.message).slice(0, 160)}`);
          return null;
        });
      }
    }),
  );
  return results;
}

async function processPost(post, index) {
  if (post.date && new Date(post.date) < CUTOFF) return { skipped: "before cutoff" };

  const car = await withRetry(() => extract(post.text), `llm #${index}`);
  if (!car.is_car_listing || !car.title || !car.price_eur) {
    return { skipped: `not a listing (${(post.text || "").slice(0, 50)}…)` };
  }

  const reg = car.first_registration || "01/2000";
  const slug = slugify(`${car.title} ${reg.replace("/", "")}`);

  const exists = await prisma.car.findUnique({ where: { slug }, select: { id: true } });
  if (exists) return { skipped: `exists: ${slug}` };

  // Download + upload all images of this post in parallel.
  const uploaded = (
    await Promise.all(
      post.images.slice(0, 10).map((url, i) => {
        const key = `cars/fb-${slug.slice(0, 60)}-${String(i + 1).padStart(2, "0")}.jpg`;
        return withRetry(() => importImage(url, key), `img ${slug}/${i + 1}`)
          .then((publicSrc) => ({ url: publicSrc, key, order: i }))
          .catch(() => null);
      }),
    )
  ).filter(Boolean);

  await prisma.car.create({
    data: {
      slug,
      title: car.title,
      brand: car.brand || car.title.split(" ")[0],
      model: car.model || "",
      published: true,
      priceEur: Math.round(car.price_eur),
      bodyType: car.body_type || "LIMUZINA",
      firstRegistration: reg,
      mileageKm: car.mileage_km ?? 0,
      fuelType: car.fuel_type || "DIESEL",
      powerKw: car.power_kw ?? (car.power_ks ? Math.round(car.power_ks * 0.7355) : 0),
      powerKs: car.power_ks ?? (car.power_kw ? Math.round(car.power_kw / 0.7355) : 0),
      transmission: car.transmission || "MANUALNI",
      emissionClass: car.emission_class,
      previousOwners: car.previous_owners,
      description: car.description_hr || null,
      warranty: car.warranty || null,
      equipment: car.equipment ?? [],
      images: {
        create: uploaded.map((img) => ({
          url: img.url,
          key: img.key,
          alt: `${car.title} — slika ${img.order + 1}`,
          sortOrder: img.order,
          isPrimary: img.order === 0,
        })),
      },
    },
  });

  return { created: slug, images: uploaded.length };
}

const posts = JSON.parse(readFileSync(FILE, "utf8"));
console.log(`${posts.length} posts in ${FILE} — processing (parallel)…`);

const results = await pool(posts, 6, processPost);

const created = results.filter((r) => r?.created);
const skipped = results.filter((r) => r?.skipped);
for (const r of created) console.log(`+ ${r.created} (${r.images} images)`);
for (const r of skipped) console.log(`~ skip: ${r.skipped}`);
console.log(
  `done: ${created.length} created, ${skipped.length} skipped, ${results.filter((r) => r === null).length} failed`,
);
await prisma.$disconnect();
