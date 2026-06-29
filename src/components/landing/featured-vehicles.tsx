import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CarCard } from "@/components/car/car-card";
import type { CarWithImages } from "@/lib/cars";

interface FeaturedVehiclesProps {
  cars: CarWithImages[];
}

/**
 * Curated selection (scarcity + curation framing). Showing a hand-picked few
 * — not the whole lot — signals selectivity and nudges toward the full catalog.
 */
export function FeaturedVehicles({ cars }: FeaturedVehiclesProps) {
  if (cars.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent-600">
            Izdvojeno iz ponude
          </span>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Pažljivo odabrana vozila
          </h2>
          <p className="mt-2 max-w-md text-muted">
            Svaki primjerak je provjeren i spreman za financiranje. Najtraženiji
            modeli odlaze brzo.
          </p>
        </div>

        <Button asChild variant="outline" size="lg" className="hidden sm:inline-flex">
          <Link href="/vozila">
            Pogledaj sva vozila
            <ArrowRight className="size-5" />
          </Link>
        </Button>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
        {cars.map((car) => (
          <CarCard key={car.id} car={car} />
        ))}
      </div>

      <div className="mt-8 sm:hidden">
        <Button asChild variant="outline" size="lg" className="w-full">
          <Link href="/vozila">
            Pogledaj sva vozila
            <ArrowRight className="size-5" />
          </Link>
        </Button>
      </div>
    </section>
  );
}
