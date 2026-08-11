import type { Metadata } from "next";
import Link from "next/link";
import { BodyType, Country, FuelType, Transmission } from "@prisma/client";
import {
  getCars,
  getFilterFacets,
  getInventoryUpdatedAt,
  type CarFilters as CarFiltersType,
} from "@/lib/cars";
import { getT, requireLocale } from "@/lib/i18n/server";
import { SEO } from "@/lib/i18n/seo-strings";
import { pageMetadata } from "@/lib/seo";
import { localePath } from "@/lib/i18n/config";
import { fmtDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CarCard } from "@/components/car/car-card";
import { CarFilters } from "@/components/car/car-filters";
import { Pagination } from "@/components/car/pagination";
import { BreadcrumbJsonLd } from "@/components/site/structured-data";

type SearchParams = Record<string, string | string[] | undefined>;

type Params = { params: Promise<{ lang: string }> };

/** Every filter the listing accepts. `page` is deliberately not one of them. */
const FILTER_PARAMS = [
  "country",
  "brand",
  "model",
  "bodyType",
  "fuelType",
  "transmission",
  "seats",
  "yearMin",
  "yearMax",
  "priceMin",
  "priceMax",
  "sort",
] as const;

/**
 * Filtered views are near-infinite in number and near-identical in content, so
 * they get noindex,follow — crawlers still walk through to the car pages, but
 * the permutations never enter the index.
 *
 * Pagination is the opposite case: /vozila?page=3 must self-canonicalize, not
 * collapse onto page 1, or the cars only reachable from page 3 never get
 * discovered. Collapsing it is what the previous hardcoded canonical did.
 */
export async function generateMetadata({
  params,
  searchParams,
}: Params & { searchParams: Promise<SearchParams> }): Promise<Metadata> {
  const locale = requireLocale((await params).lang);
  const sp = await searchParams;

  const isFiltered = FILTER_PARAMS.some((key) => sp[key]);
  const page = toInt(first(sp.page));
  const suffix = page && page > 1 ? `?page=${page}` : "";

  const base = pageMetadata({
    ...SEO.vozila[locale],
    path: `/vozila${suffix}`,
    locale,
  });

  if (isFiltered) {
    return {
      ...base,
      alternates: { canonical: localePath(locale, `/vozila${suffix}`) },
      robots: { index: false, follow: true },
    };
  }

  return base;
}

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
  params: Promise<{ lang: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const sp = await props.searchParams;
  const { t, locale } = await getT(props.params);
  const updatedAt = await getInventoryUpdatedAt();

  const country = asEnum(Country, first(sp.country));
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
    country,
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
      <BreadcrumbJsonLd
        locale={locale}
        trail={[{ name: t.navCars, path: "/vozila" }]}
      />
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
            country,
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
            <Link href={localePath(locale, "/vozila")}>{t.filtReset}</Link>
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
              locale={locale}
              prevLabel={t.pagePrev}
              nextLabel={t.pageNext}
            />
          </div>
        </>
      )}
    </div>
  );
}
