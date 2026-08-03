import type { Metadata } from "next";
import Link from "next/link";
import { BodyType, FuelType, Transmission } from "@prisma/client";
import {
  getCars,
  getFilterFacets,
  getInventoryUpdatedAt,
  type CarFilters as CarFiltersType,
} from "@/lib/cars";
import { getT } from "@/lib/i18n/server";
import { fmtDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CarCard } from "@/components/car/car-card";
import { CarFilters } from "@/components/car/car-filters";
import { Pagination } from "@/components/car/pagination";

export const metadata: Metadata = {
  title: "Ponuda vozila",
  description:
    "Pregledajte ponudu provjerenih vozila iz Njemačke i Austrije — AUTOCAR EU. Filtrirajte po marki, modelu, godištu, cijeni i više.",
  alternates: { canonical: "/vozila" },
};

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function toInt(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const n = Number(value);
  return Number.isInteger(n) ? n : undefined;
}

const SORT_VALUES = new Set(["newest", "price-asc", "price-desc", "km-asc"]);

/** Only pass whitelisted enum values to Prisma — anything else 500s the query. */
function asEnum<T extends string>(
  values: Record<string, T>,
  raw: string | undefined,
): T | undefined {
  return raw && Object.values(values).includes(raw as T)
    ? (raw as T)
    : undefined;
}

export default async function VozilaPage(props: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await props.searchParams;
  const { t, locale } = await getT();
  const updatedAt = await getInventoryUpdatedAt();

  const brand = first(sp.brand);
  const model = first(sp.model);
  const bodyType = asEnum(BodyType, first(sp.bodyType));
  const fuelType = asEnum(FuelType, first(sp.fuelType));
  const transmission = asEnum(Transmission, first(sp.transmission));
  const seats = first(sp.seats);
  const yearMin = first(sp.yearMin);
  const yearMax = first(sp.yearMax);
  const priceMin = first(sp.priceMin);
  const priceMax = first(sp.priceMax);
  const sortRaw = first(sp.sort);
  const sort = sortRaw && SORT_VALUES.has(sortRaw) ? sortRaw : undefined;
  const page = toInt(first(sp.page)) ?? 1;

  const filters: CarFiltersType = {
    brand,
    model,
    bodyType,
    fuelType,
    transmission,
    seats: toInt(seats),
    yearMin: toInt(yearMin),
    yearMax: toInt(yearMax),
    priceMin: toInt(priceMin),
    priceMax: toInt(priceMax),
    sort: sort as CarFiltersType["sort"],
    page,
    perPage: 12,
  };

  const [{ items, total, pages, page: currentPage }, facets] = await Promise.all([
    getCars(filters),
    getFilterFacets(),
  ]);

  // Params to preserve in pagination links.
  const preserved: Record<string, string | undefined> = {
    brand,
    model,
    bodyType,
    fuelType,
    transmission,
    seats,
    yearMin,
    yearMax,
    priceMin,
    priceMax,
    sort: sortRaw,
  };

  return (
    <div className="mx-auto max-w-[1240px] px-5 py-10 sm:px-10 lg:px-14 lg:py-[52px]">
      <header className="mb-9 text-center">
        <div className="mb-2.5 font-display text-[12px] uppercase tracking-[4px] text-primary">
          {total} {t.inView} · 350+ {t.inStock}
        </div>
        <h1 className="font-display text-[clamp(28px,6vw,40px)] font-semibold uppercase text-foreground">
          {t.navCars}
        </h1>
        {updatedAt && (
          <p className="mt-3 text-[13px] text-muted">
            {t.lastUpdated}:{" "}
            <time dateTime={updatedAt.toISOString()}>{fmtDate(updatedAt, locale)}</time>
          </p>
        )}
      </header>

      <div className="mb-[26px]">
        {/* Keyed by the applied filters so client state remounts in sync with
            the URL (reset links, back/forward, nav clicks). */}
        <CarFilters
          key={[
            brand, model, bodyType, fuelType, transmission,
            seats, yearMin, yearMax, priceMin, priceMax, sortRaw,
          ].join("|")}
          brands={facets.brands}
          modelsByBrand={facets.modelsByBrand}
          initial={{
            brand,
            model,
            bodyType,
            fuelType,
            transmission,
            seats,
            yearMin,
            yearMax,
            priceMin,
            priceMax,
            sort: sortRaw,
          }}
        />
      </div>

      {items.length === 0 ? (
        <div className="border border-dashed border-border-strong py-14 text-center">
          <p className="mb-3.5 text-[16px] text-muted-2">{t.noResults}</p>
          <Button asChild variant="goldOutline">
            <Link href="/vozila">{t.filtReset}</Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="grid gap-[22px] [grid-template-columns:repeat(auto-fill,minmax(270px,1fr))]">
            {items.map((car) => (
              <CarCard
                key={car.id}
                car={car}
                locale={locale}
                detailsLabel={t.details}
              />
            ))}
          </div>

          <div className="mt-10">
            <Pagination
              page={currentPage}
              pages={pages}
              params={preserved}
              prevLabel={t.pagePrev}
              nextLabel={t.pageNext}
            />
          </div>
        </>
      )}
    </div>
  );
}
