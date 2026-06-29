import type { Metadata } from "next";
import { CarFront } from "lucide-react";
import { getCars, getFilterFacets, type CarFilters as CarFiltersType } from "@/lib/cars";
import { CarCard } from "@/components/car/car-card";
import { CarFilters } from "@/components/car/car-filters";
import { Pagination } from "@/components/car/pagination";

export const metadata: Metadata = {
  title: "Vozila — KupiAuto.de",
  description:
    "Pregledajte našu ponudu provjerenih rabljenih vozila iz Njemačke. Filtrirajte po marki, modelu, godištu, cijeni i više.",
};

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function toInt(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

const SORT_VALUES = new Set(["newest", "price-asc", "price-desc", "km-asc"]);

export default async function VozilaPage(props: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await props.searchParams;

  const brand = first(sp.brand);
  const model = first(sp.model);
  const bodyType = first(sp.bodyType);
  const fuelType = first(sp.fuelType);
  const transmission = first(sp.transmission);
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
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <header className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          Naša ponuda vozila
        </h1>
        <p className="mt-1.5 text-muted">
          Provjerena rabljena vozila iz Njemačke uz financiranje 100% online.
        </p>
      </header>

      <CarFilters
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

      <div className="mt-6 flex items-center justify-between">
        <p className="text-sm font-medium text-muted">
          {total === 0
            ? "Nema rezultata"
            : `${total} ${total === 1 ? "vozilo" : total >= 2 && total <= 4 ? "vozila" : "vozila"}`}
        </p>
      </div>

      {items.length === 0 ? (
        <div className="mt-8 flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface px-6 py-16 text-center">
          <CarFront className="size-12 text-muted" />
          <h2 className="mt-4 text-lg font-semibold text-foreground">
            Nema vozila za odabrane filtere
          </h2>
          <p className="mt-1.5 max-w-md text-sm text-muted">
            Pokušajte proširiti kriterije pretrage ili nas kontaktirajte — rado
            ćemo vam pomoći pronaći željeno vozilo.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((car) => (
              <CarCard key={car.id} car={car} />
            ))}
          </div>

          <div className="mt-10">
            <Pagination page={currentPage} pages={pages} params={preserved} />
          </div>
        </>
      )}
    </div>
  );
}
