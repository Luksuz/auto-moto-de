import { CarCard } from "@/components/car/car-card";
import type { CarWithImages } from "@/lib/cars";
import type { Locale } from "@/lib/i18n/config";
import type { Dict } from "@/lib/i18n/dictionary";

/** Homepage "featured vehicles" section: centered header + card grid. */
export function FeaturedCars({
  t,
  locale,
  cars,
}: {
  t: Dict;
  locale: Locale;
  cars: CarWithImages[];
}) {
  if (!cars.length) return null;

  return (
    <section className="px-5 py-15 sm:px-10 lg:px-14">
      <div className="mb-[34px] text-center">
        <div className="mb-2.5 font-display text-[12px] uppercase tracking-[4px] text-primary">
          {t.featKicker}
        </div>
        <h2 className="font-display text-[34px] font-semibold uppercase">
          {t.featTitle}
        </h2>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(270px,1fr))] gap-[22px]">
        {cars.map((car) => (
          <CarCard
            key={car.id}
            car={car}
            locale={locale}
            detailsLabel={t.details}
          />
        ))}
      </div>
    </section>
  );
}
