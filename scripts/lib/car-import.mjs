// Write side of the mobile.de pipeline: turn a scraped listing record into a Car
// row (+ CarImage rows, photos optimized and uploaded to MinIO).
//
// Extracted from scripts/import-mobilede.mjs so the CLI importer and the Railway
// cron worker share one implementation.
//
// Idempotent via Car.sourceId ("mobilede:<listingId>"): a re-run updates the
// mutable fields (price, mileage, description…) and appends only photos we don't
// already have.
import { PutObjectCommand, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import {
  FULL_WIDTH,
  FULL_QUALITY,
  VARIANTS,
  variantKey,
  allSizes,
} from "../../src/lib/image-sizes.mjs";

const KW_PER_KS = 0.7355;
const REG_RE = /^(0[1-9]|1[0-2])\/\d{4}$/;

/** Same algorithm as slugify() in src/lib/utils.ts. */
export function slugify(input) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 80);
}

/** getFilterFacets() in src/lib/cars.ts builds the public brand dropdown from
 *  DISTINCT Car.brand, so "Skoda" and "Škoda" would show up as two filters.
 *  Collapse the spellings mobile.de mixes. */
const BRAND_ALIASES = new Map([
  ["skoda", "Škoda"], ["škoda", "Škoda"], ["vw", "Volkswagen"], ["volkswagen", "Volkswagen"],
  ["mercedes", "Mercedes-Benz"], ["mercedes benz", "Mercedes-Benz"], ["mercedes-benz", "Mercedes-Benz"],
  ["bmw", "BMW"], ["audi", "Audi"], ["seat", "SEAT"], ["cupra", "CUPRA"],
  ["citroen", "Citroën"], ["citroën", "Citroën"], ["opel", "Opel"], ["peugeot", "Peugeot"],
  ["renault", "Renault"], ["ford", "Ford"], ["hyundai", "Hyundai"], ["kia", "Kia"],
  ["toyota", "Toyota"], ["nissan", "Nissan"], ["mazda", "Mazda"], ["volvo", "Volvo"],
  ["fiat", "Fiat"], ["dacia", "Dacia"], ["mini", "MINI"], ["land rover", "Land Rover"],
  ["range rover", "Land Rover"], ["jeep", "Jeep"], ["porsche", "Porsche"], ["tesla", "Tesla"],
  ["suzuki", "Suzuki"], ["mitsubishi", "Mitsubishi"], ["honda", "Honda"], ["alfa romeo", "Alfa Romeo"],
]);

export function normalizeBrand(brand) {
  const raw = (brand ?? "").trim();
  if (!raw) return "";
  return BRAND_ALIASES.get(raw.toLowerCase()) ?? raw;
}

/** carSchema in src/lib/validators.ts enforces a zero-padded MM/YYYY. */
export function normalizeRegistration(value) {
  const raw = (value ?? "").trim();
  if (REG_RE.test(raw)) return raw;
  let m = raw.match(/^(\d{1,2})\s*[/.\-]\s*(\d{4})$/);
  if (m) {
    const month = Math.min(12, Math.max(1, Number(m[1])));
    return `${String(month).padStart(2, "0")}/${m[2]}`;
  }
  m = raw.match(/\b(19|20)\d{2}\b/);
  if (m) return `01/${m[0]}`;
  return null;
}

export const imageKey = (listingId, hash) => `cars/md-${listingId}-${hash}.jpg`;

// Sizes live in one file shared with the Next app — see the rationale there.
// Imported (uploadImage below needs them in scope) and re-exported, so the
// scripts that already pull them from here keep working.
export { FULL_WIDTH, FULL_QUALITY, VARIANTS, variantKey, allSizes };

/** Storage is out of space. Distinct from a per-photo failure because it is not
 *  one: every remaining upload in the run will fail identically, so the caller
 *  stops instead of manufacturing hundreds of cars with no photos. That is
 *  exactly what happened on 2026-08-11 — the drive filled 18 minutes into a
 *  206-car import and the last 54 cars were published photo-less, while the run
 *  reported SUCCESS because these errors were being discarded. */
export class StorageFull extends Error {
  name = "StorageFull";
}

export const isStorageFull = (err) =>
  err?.name === "XMinioStorageFull" ||
  /minimum free drive threshold|storage backend has reached/i.test(err?.message ?? "");

async function withRetry(fn, label, tries = 3, log = () => {}) {
  for (let i = 1; i <= tries; i++) {
    try {
      return await fn();
    } catch (err) {
      // Retrying a full drive just burns the budget three times per photo.
      if (i === tries || isStorageFull(err)) throw err;
      log(`  retry ${i}/${tries} ${label}: ${String(err.message).slice(0, 100)}`);
      await new Promise((r) => setTimeout(r, 1500 * i));
    }
  }
}

export function createImporter({ prisma, s3, bucket, endpoint, log = () => {} }) {
  const publicUrl = (key) => `${endpoint.replace(/\/$/, "")}/${bucket}/${encodeURI(key)}`;

  /** Only one Car row may carry a given slug (src/lib/actions/cars.ts uniqueSlug). */
  async function uniqueSlug(base, ignoreId) {
    const root = slugify(base) || "vozilo";
    let slug = root;
    for (let i = 2; ; i++) {
      const hit = await prisma.car.findUnique({ where: { slug }, select: { id: true } });
      if (!hit || hit.id === ignoreId) return slug;
      slug = `${root}-${i}`.slice(0, 80);
    }
  }

  async function putJpeg(key, body) {
    await s3.send(
      new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: "image/jpeg" }),
    );
    return publicUrl(key);
  }

  /** Writes the full-size object plus every VARIANT, all from one download. */
  async function uploadImage(sourceUrl, key) {
    const res = await fetch(sourceUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        Referer: "https://suchen.mobile.de/",
      },
    });
    if (!res.ok) throw new Error(`image ${res.status}`);
    const input = Buffer.from(await res.arrayBuffer());
    // .rotate() applies the EXIF orientation before any resize, so every variant
    // comes out the same way up.
    const upright = sharp(input).rotate();

    const full = await upright
      .clone()
      .resize({ width: FULL_WIDTH, withoutEnlargement: true })
      .jpeg({ quality: FULL_QUALITY, mozjpeg: true })
      .toBuffer();

    const out = { url: await putJpeg(key, full), key };

    for (const v of VARIANTS) {
      const buf = await upright
        .clone()
        .resize({ width: v.width, withoutEnlargement: true })
        .jpeg({ quality: v.quality, mozjpeg: true })
        .toBuffer();
      const vKey = variantKey(key, v.suffix);
      out[`${v.name}Url`] = await putJpeg(vKey, buf);
      out[`${v.name}Key`] = vKey;
    }
    return out;
  }

  /** @returns {Promise<{rows: object[], failed: {hash: string, error: string}[]}>}
   *
   *  Failures are RETURNED, not swallowed. They used to be `.catch(() => null)`,
   *  which meant a car whose every photo failed was created silently and the run
   *  still finished SUCCESS — the failure only surfaced when someone looked at
   *  the site. The caller reports these so the run lands PARTIAL. */
  async function uploadImages(images, listingId, title, startOrder = 0) {
    const settled = await Promise.all(
      images.map(async (img) => {
        const key = imageKey(listingId, img.hash);
        try {
          const uploaded = await withRetry(
            () => uploadImage(img.url, key),
            `img ${listingId}/${img.hash}`,
            3,
            log,
          );
          return { ok: true, uploaded };
        } catch (err) {
          return { ok: false, hash: img.hash, err };
        }
      }),
    );

    const full = settled.find((s) => !s.ok && isStorageFull(s.err));
    if (full) throw new StorageFull(String(full.err.message).slice(0, 120));

    // Numbered after filtering, so a failure in the middle does not leave a hole
    // in sortOrder — and a failure of the FIRST photo does not leave the car
    // with no primary image at all.
    const rows = settled
      .filter((s) => s.ok)
      .map((s, i) => ({
        ...s.uploaded,
        alt: `${title} — slika ${startOrder + i + 1}`,
        sortOrder: startOrder + i,
        isPrimary: startOrder + i === 0,
      }));

    const failed = settled
      .filter((s) => !s.ok)
      .map((s) => ({ hash: s.hash, error: String(s.err.message).slice(0, 80) }));

    return { rows, failed };
  }

  /** @returns {{created?:string, updated?:string, skipped?:string, images:number}} */
  async function importListing(listing, { dealerSourceId = null, country = "DE", dryRun = false } = {}) {
    const car = listing.extracted;

    if (car.is_car_listing === false) return { skipped: `not a listing: ${listing.listingId}`, images: 0 };
    if (!car.title?.trim()) return { skipped: `no title: ${listing.listingId}`, images: 0 };
    // carSchema requires priceEur to be a positive int — "Preis auf Anfrage" can't be imported.
    if (!car.price_eur || car.price_eur <= 0) {
      return { skipped: `no price: ${listing.listingId} (${car.title.slice(0, 40)})`, images: 0 };
    }

    const reg = normalizeRegistration(car.first_registration) ?? "01/2000";
    const brand = normalizeBrand(car.brand) || car.title.trim().split(/\s+/)[0];
    const sourceId = `mobilede:${listing.listingId}`;

    const powerKw = car.power_kw ?? (car.power_ks ? Math.round(car.power_ks * KW_PER_KS) : 0);
    const powerKs = car.power_ks ?? (car.power_kw ? Math.round(car.power_kw / KW_PER_KS) : 0);

    const scalars = {
      title: car.title.trim(),
      brand,
      model: (car.model ?? "").trim(),
      priceEur: Math.round(car.price_eur),
      bodyType: car.body_type ?? "LIMUZINA",
      firstRegistration: reg,
      mileageKm: Math.max(0, Math.round(car.mileage_km ?? 0)),
      fuelType: car.fuel_type ?? "DIESEL",
      powerKw,
      powerKs,
      transmission: car.transmission ?? "MANUALNI",
      engineCcm: car.engine_ccm ?? null,
      doors: car.doors ?? null,
      seats: car.seats ?? null,
      airConditioning: car.air_conditioning ?? null,
      parkingSensors: car.parking_sensors ?? null,
      tuv: car.tuv ?? null,
      emissionClass: car.emission_class ?? null,
      previousOwners: car.previous_owners ?? null,
      description: car.description ?? null,
      warranty: car.warranty ?? null,
      equipment: car.equipment ?? [],
      sourceUrl: listing.url,
      dealerSourceId,
      // Copied from the source so the public country filter is one indexed
      // column instead of a join through DealerSource.
      country,
    };

    if (dryRun) {
      return {
        dry:
          `${scalars.brand} ${scalars.model} — ${scalars.priceEur} EUR, ${scalars.mileageKm} km, ` +
          `${reg}, ${scalars.fuelType}/${scalars.transmission}, ${powerKs} PS, ` +
          `${scalars.equipment.length} equip, ${listing.images.length} img`,
        images: 0,
      };
    }

    const existing = await prisma.car.findUnique({
      where: { sourceId },
      select: { id: true, title: true, images: { select: { key: true } } },
    });

    if (existing) {
      // Price and mileage move while a listing is live; refresh them, and add any
      // photos the seller has since uploaded. Never touch slug/published.
      await prisma.car.update({ where: { id: existing.id }, data: scalars });

      const have = new Set(existing.images.map((i) => i.key));
      const missing = listing.images.filter((img) => !have.has(imageKey(listing.listingId, img.hash)));
      if (missing.length === 0) return { updated: `${sourceId} (${scalars.title.slice(0, 40)})`, images: 0 };

      const { rows, failed } = await uploadImages(missing, listing.listingId, existing.title, have.size);
      await prisma.carImage.createMany({ data: rows.map((img) => ({ ...img, carId: existing.id })) });
      return {
        updated: `${sourceId} (+${rows.length} images)`,
        images: rows.length,
        failedImages: failed.length,
        imageError: failed[0]?.error,
      };
    }

    const { rows, failed } = await uploadImages(listing.images, listing.listingId, scalars.title);

    // A car with no photos is close to useless to a buyer, and publishing one is
    // how a storage failure reached the client's eyes. If the listing HAS photos
    // and none of them made it, leave the car uncreated — the next run picks it
    // up cleanly rather than leaving an empty listing to be repaired by hand.
    if (listing.images.length > 0 && rows.length === 0) {
      return {
        skipped: `${listing.listingId}: all ${listing.images.length} photo(s) failed to upload (${failed[0]?.error ?? "unknown"})`,
        images: 0,
        failedImages: failed.length,
      };
    }

    const slug = await uniqueSlug(`${scalars.title} ${reg.replace("/", "")}`);

    await prisma.car.create({
      data: { ...scalars, slug, sourceId, published: true, images: { create: rows } },
    });

    return {
      created: slug,
      images: rows.length,
      failedImages: failed.length,
      imageError: failed[0]?.error,
    };
  }

  /** Remove cars (and their MinIO objects) that a dealer no longer lists.
   *  Leads referencing them survive with carId set to null (schema onDelete:
   *  SetNull), so the enquiry history is not lost with the car. */
  async function deleteCars(carIds) {
    if (carIds.length === 0) return { deleted: 0, objects: 0 };

    const images = await prisma.carImage.findMany({
      where: { carId: { in: carIds } },
      select: { key: true, thumbKey: true, mediumKey: true },
    });
    // Every size, or the variants orphan in storage forever.
    const keys = images.flatMap((i) => [i.key, i.thumbKey, i.mediumKey].filter(Boolean));

    // S3 DeleteObjects caps at 1000 keys per call.
    for (let i = 0; i < keys.length; i += 1000) {
      const batch = keys.slice(i, i + 1000);
      try {
        await s3.send(
          new DeleteObjectsCommand({
            Bucket: bucket,
            Delete: { Objects: batch.map((Key) => ({ Key })) },
          }),
        );
      } catch (err) {
        // An orphaned object costs storage; a failed delete must not abort the
        // run or leave the Car row behind pointing at photos we already removed.
        log(`  ! could not delete ${batch.length} object(s): ${String(err.message).slice(0, 90)}`);
      }
    }

    // CarImage rows cascade with the Car.
    await prisma.car.deleteMany({ where: { id: { in: carIds } } });
    return { deleted: carIds.length, objects: keys.length };
  }

  return { importListing, deleteCars, uniqueSlug, publicUrl };
}
