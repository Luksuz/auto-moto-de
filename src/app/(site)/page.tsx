import type { Metadata } from "next";
import { Hero } from "@/components/landing/hero";
import { TrustBar } from "@/components/landing/trust-bar";
import { FeaturedVehicles } from "@/components/landing/featured-vehicles";
import { FinancingBand } from "@/components/landing/financing-band";
import { PurchaseProcess } from "@/components/landing/purchase-process";
import { SocialProof } from "@/components/landing/social-proof";
import { FinalCta } from "@/components/landing/final-cta";
import { StickyCta } from "@/components/landing/sticky-cta";
import { getFeaturedCars, getLatestCars, getFilterFacets } from "@/lib/cars";

export const metadata: Metadata = {
  title: "Rabljena vozila iz Njemačke uz financiranje 100% online",
  description:
    "Pronađi svoj auto iz Njemačke uz financiranje 100% online — 0% učešća i odobrenje za 24h za sve zaposlene u Njemačkoj. Provjerena vozila, EU porijeklo, garancija.",
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const [featured, facets] = await Promise.all([
    getFeaturedCars(4),
    getFilterFacets(),
  ]);

  // Fall back to latest cars if nothing is explicitly featured.
  const featuredCars =
    featured.length >= 4 ? featured : await getLatestCars(4);

  return (
    <>
      <Hero brands={facets.brands} modelsByBrand={facets.modelsByBrand} />
      <TrustBar />
      <FeaturedVehicles cars={featuredCars} />
      <FinancingBand />
      <PurchaseProcess />
      <SocialProof />
      <FinalCta />
      {/* Spacer so the sticky mobile bar never covers footer content. */}
      <div className="h-16 lg:hidden" aria-hidden />
      <StickyCta />
    </>
  );
}
