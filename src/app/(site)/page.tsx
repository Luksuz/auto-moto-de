import type { Metadata } from "next";
import { Hero } from "@/components/home/hero";
import { UspStrip } from "@/components/home/usp-strip";
import { FeaturedCars } from "@/components/home/featured-cars";
import { ServiceTeasers } from "@/components/home/service-teasers";
import { getFeaturedCars, getLatestCars } from "@/lib/cars";
import { getT } from "@/lib/i18n/server";

export const metadata: Metadata = {
  title: { absolute: "AUTOCAR EU — Vozila iz Njemačke i Austrije" },
  description:
    "Osam godina povjerenja, preko 350 provjerenih vozila na stanju i garancija do 3 godine. Financiranje dostupno svima koji rade u Njemačkoj i Austriji.",
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const [{ t, locale }, featured] = await Promise.all([
    getT(),
    getFeaturedCars(3),
  ]);

  // Fall back to the latest cars if fewer than 3 are explicitly featured.
  const cars = featured.length >= 3 ? featured : await getLatestCars(3);

  return (
    <>
      <Hero t={t} />
      <UspStrip t={t} />
      <FeaturedCars t={t} locale={locale} cars={cars} />
      <ServiceTeasers t={t} />
    </>
  );
}
