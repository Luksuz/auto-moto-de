import type { Metadata } from "next";
import { Hero } from "@/components/home/hero";
import { UspStrip } from "@/components/home/usp-strip";
import { FeaturedCars } from "@/components/home/featured-cars";
import { ServiceTeasers } from "@/components/home/service-teasers";
import { getFeaturedCars } from "@/lib/cars";
import { getT, requireLocale } from "@/lib/i18n/server";
import { SEO } from "@/lib/i18n/seo-strings";
import { pageMetadata } from "@/lib/seo";

type Params = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const locale = requireLocale((await params).lang);
  const { title, description } = SEO.home[locale];

  return {
    // The home title is the brand line itself, so it skips the "%s | AUTOCAR EU"
    // template rather than repeating the name twice.
    ...pageMetadata({ title, description, path: "/", locale }),
    title: { absolute: title },
  };
}

export default async function HomePage({ params }: Params) {
  const [{ t, locale }, cars] = await Promise.all([
    getT(params),
    getFeaturedCars(3),
  ]);

  return (
    <>
      <Hero t={t} />
      <UspStrip t={t} />
      <FeaturedCars t={t} locale={locale} cars={cars} />
      <ServiceTeasers t={t} locale={locale} />
    </>
  );
}
