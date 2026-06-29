"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { slugify } from "@/lib/utils";
import { deleteObject } from "@/lib/minio";
import { carSchema, type CarInput, type CarImageInput } from "@/lib/validators";

export type CarActionState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};

/** Generate a unique slug, appending -2, -3, ... if needed. */
async function uniqueSlug(base: string, ignoreId?: string): Promise<string> {
  const root = slugify(base) || "vozilo";
  let candidate = root;
  let n = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await prisma.car.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing || existing.id === ignoreId) return candidate;
    n += 1;
    candidate = `${root}-${n}`;
  }
}

function normalizeImages(images: CarImageInput[]) {
  // Ensure exactly one primary; default to first if none flagged.
  const sorted = [...images].sort((a, b) => a.sortOrder - b.sortOrder);
  let hasPrimary = sorted.some((i) => i.isPrimary);
  return sorted.map((img, idx) => ({
    ...img,
    sortOrder: idx,
    isPrimary: img.isPrimary
      ? true
      : !hasPrimary && idx === 0
        ? ((hasPrimary = true), true)
        : false,
  }));
}

function toCarData(data: ReturnType<typeof carSchema.parse>) {
  return {
    title: data.title,
    brand: data.brand,
    model: data.model,
    published: data.published,
    featured: data.featured,
    priceEur: data.priceEur,
    priceRating: data.priceRating ?? null,
    assignedAgentId: data.assignedAgentId ?? null,
    bodyType: data.bodyType,
    firstRegistration: data.firstRegistration,
    mileageKm: data.mileageKm,
    fuelType: data.fuelType,
    powerKw: data.powerKw,
    powerKs: data.powerKs,
    transmission: data.transmission,
    engineCcm: data.engineCcm ?? null,
    doors: data.doors ?? null,
    seats: data.seats ?? null,
    airConditioning: data.airConditioning ?? null,
    parkingSensors: data.parkingSensors ?? null,
    tuv: data.tuv ?? null,
    emissionClass: data.emissionClass ?? null,
    origin: data.origin ?? null,
    previousOwners: data.previousOwners ?? null,
    description: data.description ?? null,
    warranty: data.warranty ?? null,
    originDetails: data.originDetails ?? null,
    equipment: data.equipment,
  };
}

function parseInput(input: CarInput) {
  const result = carSchema.safeParse(input);
  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const path = issue.path.join(".");
      if (!fieldErrors[path]) fieldErrors[path] = issue.message;
    }
    return { error: result.error.issues[0]?.message, fieldErrors };
  }
  return { data: result.data };
}

export async function createCar(input: CarInput): Promise<CarActionState> {
  await requireUser();
  const parsed = parseInput(input);
  if (!parsed.data)
    return { ok: false, error: parsed.error, fieldErrors: parsed.fieldErrors };

  const data = parsed.data;
  const slug = await uniqueSlug(data.slug || data.title);
  const images = normalizeImages(data.images);

  const car = await prisma.car.create({
    data: {
      ...toCarData(data),
      slug,
      images: {
        create: images.map((img) => ({
          url: img.url,
          key: img.key,
          alt: img.alt ?? null,
          sortOrder: img.sortOrder,
          isPrimary: img.isPrimary,
        })),
      },
    },
  });

  revalidatePath("/admin/vozila");
  revalidatePath("/vozila");
  redirect(`/admin/vozila/${car.id}`);
}

export async function updateCar(
  id: string,
  input: CarInput,
): Promise<CarActionState> {
  await requireUser();
  const parsed = parseInput(input);
  if (!parsed.data)
    return { ok: false, error: parsed.error, fieldErrors: parsed.fieldErrors };

  const data = parsed.data;

  const existing = await prisma.car.findUnique({
    where: { id },
    include: { images: true },
  });
  if (!existing) return { ok: false, error: "Vozilo nije pronađeno" };

  const slug =
    data.slug && slugify(data.slug) !== existing.slug
      ? await uniqueSlug(data.slug, id)
      : existing.slug;

  const images = normalizeImages(data.images);
  const keptIds = new Set(images.filter((i) => i.id).map((i) => i.id as string));
  const removed = existing.images.filter((i) => !keptIds.has(i.id));

  await prisma.$transaction(async (tx) => {
    await tx.car.update({
      where: { id },
      data: { ...toCarData(data), slug },
    });

    if (removed.length) {
      await tx.carImage.deleteMany({
        where: { id: { in: removed.map((i) => i.id) } },
      });
    }

    for (const img of images) {
      if (img.id && keptIds.has(img.id)) {
        await tx.carImage.update({
          where: { id: img.id },
          data: {
            sortOrder: img.sortOrder,
            isPrimary: img.isPrimary,
            alt: img.alt ?? null,
          },
        });
      } else {
        await tx.carImage.create({
          data: {
            carId: id,
            url: img.url,
            key: img.key,
            alt: img.alt ?? null,
            sortOrder: img.sortOrder,
            isPrimary: img.isPrimary,
          },
        });
      }
    }
  });

  // Remove orphaned objects from storage (best-effort, outside transaction).
  await Promise.allSettled(removed.map((i) => deleteObject(i.key)));

  revalidatePath("/admin/vozila");
  revalidatePath(`/admin/vozila/${id}`);
  revalidatePath("/vozila");
  revalidatePath(`/vozila/${slug}`);
  return { ok: true };
}

export async function deleteCar(id: string): Promise<CarActionState> {
  await requireUser();
  const car = await prisma.car.findUnique({
    where: { id },
    include: { images: true },
  });
  if (!car) return { ok: false, error: "Vozilo nije pronađeno" };

  await prisma.car.delete({ where: { id } });
  await Promise.allSettled(car.images.map((i) => deleteObject(i.key)));

  revalidatePath("/admin/vozila");
  revalidatePath("/vozila");
  return { ok: true };
}

export async function togglePublish(
  id: string,
  published: boolean,
): Promise<CarActionState> {
  await requireUser();
  const car = await prisma.car.update({
    where: { id },
    data: { published },
    select: { slug: true },
  });
  revalidatePath("/admin/vozila");
  revalidatePath("/vozila");
  revalidatePath(`/vozila/${car.slug}`);
  return { ok: true };
}
