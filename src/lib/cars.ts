import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type CarWithImages = Prisma.CarGetPayload<{
  include: { images: true };
}>;

export type CarWithRelations = Prisma.CarGetPayload<{
  include: { images: true; assignedAgent: true };
}>;

const imageOrder: Prisma.CarImageOrderByWithRelationInput[] = [
  { isPrimary: "desc" },
  { sortOrder: "asc" },
];

/** Pick the primary image (or first) of a car. */
export function primaryImage(car: {
  images: { url: string; isPrimary: boolean; sortOrder: number }[];
}): string | null {
  if (!car.images?.length) return null;
  const sorted = [...car.images].sort(
    (a, b) =>
      Number(b.isPrimary) - Number(a.isPrimary) || a.sortOrder - b.sortOrder,
  );
  return sorted[0]?.url ?? null;
}

export interface CarFilters {
  brand?: string;
  model?: string;
  bodyType?: string;
  fuelType?: string;
  transmission?: string;
  seats?: number;
  yearMin?: number;
  yearMax?: number;
  priceMin?: number;
  priceMax?: number;
  sort?: "newest" | "price-asc" | "price-desc" | "km-asc";
  page?: number;
  perPage?: number;
}

function yearFromReg(filters: CarFilters): Prisma.CarWhereInput[] {
  // firstRegistration is stored as "MM/YYYY"; filter by trailing year string.
  const conditions: Prisma.CarWhereInput[] = [];
  if (filters.yearMin) {
    conditions.push({
      firstRegistration: { gte: `01/${filters.yearMin}` },
    });
  }
  // Year filtering is approximate due to MM/YYYY string storage; primary filters
  // (brand/price) are exact. We post-filter year below for correctness.
  return conditions;
}

function regYear(reg: string): number {
  const parts = reg.split("/");
  return Number(parts[1] ?? parts[0]) || 0;
}

export async function getCars(filters: CarFilters = {}) {
  const perPage = filters.perPage ?? 12;
  const page = Math.max(1, filters.page ?? 1);

  const where: Prisma.CarWhereInput = {
    published: true,
    ...(filters.brand ? { brand: filters.brand } : {}),
    ...(filters.model ? { model: filters.model } : {}),
    ...(filters.bodyType ? { bodyType: filters.bodyType as never } : {}),
    ...(filters.fuelType ? { fuelType: filters.fuelType as never } : {}),
    ...(filters.transmission
      ? { transmission: filters.transmission as never }
      : {}),
    ...(filters.seats ? { seats: filters.seats } : {}),
    ...(filters.priceMin || filters.priceMax
      ? {
          priceEur: {
            ...(filters.priceMin ? { gte: filters.priceMin } : {}),
            ...(filters.priceMax ? { lte: filters.priceMax } : {}),
          },
        }
      : {}),
    ...(yearFromReg(filters).length ? { AND: yearFromReg(filters) } : {}),
  };

  const orderBy: Prisma.CarOrderByWithRelationInput =
    filters.sort === "price-asc"
      ? { priceEur: "asc" }
      : filters.sort === "price-desc"
        ? { priceEur: "desc" }
        : filters.sort === "km-asc"
          ? { mileageKm: "asc" }
          : { createdAt: "desc" };

  // Fetch matching rows, then post-filter by year range (string-stored reg).
  let cars = await prisma.car.findMany({
    where,
    orderBy,
    include: { images: { orderBy: imageOrder } },
  });

  if (filters.yearMin || filters.yearMax) {
    cars = cars.filter((c) => {
      const y = regYear(c.firstRegistration);
      if (filters.yearMin && y < filters.yearMin) return false;
      if (filters.yearMax && y > filters.yearMax) return false;
      return true;
    });
  }

  const total = cars.length;
  const pages = Math.max(1, Math.ceil(total / perPage));
  const start = (page - 1) * perPage;
  const items = cars.slice(start, start + perPage);

  return { items, total, page, pages, perPage };
}

export async function getFeaturedCars(limit = 4): Promise<CarWithImages[]> {
  return prisma.car.findMany({
    where: { published: true, featured: true },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { images: { orderBy: imageOrder } },
  });
}

export async function getLatestCars(limit = 8): Promise<CarWithImages[]> {
  return prisma.car.findMany({
    where: { published: true },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { images: { orderBy: imageOrder } },
  });
}

export async function getCarBySlug(
  slug: string,
): Promise<CarWithRelations | null> {
  return prisma.car.findUnique({
    where: { slug },
    include: { images: { orderBy: imageOrder }, assignedAgent: true },
  });
}

export async function getSimilarCars(
  car: { id: string; brand: string; bodyType: string },
  limit = 4,
): Promise<CarWithImages[]> {
  return prisma.car.findMany({
    where: {
      published: true,
      id: { not: car.id },
      OR: [{ brand: car.brand }, { bodyType: car.bodyType as never }],
    },
    take: limit,
    orderBy: { createdAt: "desc" },
    include: { images: { orderBy: imageOrder } },
  });
}

/** Distinct brands (and their models) for search dropdowns. */
export async function getFilterFacets() {
  const cars = await prisma.car.findMany({
    where: { published: true },
    select: { brand: true, model: true },
  });
  const brandMap = new Map<string, Set<string>>();
  for (const c of cars) {
    if (!brandMap.has(c.brand)) brandMap.set(c.brand, new Set());
    brandMap.get(c.brand)!.add(c.model);
  }
  const brands = [...brandMap.keys()].sort();
  const modelsByBrand: Record<string, string[]> = {};
  for (const [brand, models] of brandMap) {
    modelsByBrand[brand] = [...models].sort();
  }
  return { brands, modelsByBrand };
}
