import { DEALER, SITE_URL } from "@/lib/constants";
import type { CarWithRelations } from "@/lib/cars";
import {
  FUEL_LABEL_I18N,
  TRANSMISSION_LABEL_I18N,
  BODY_TYPE_LABEL_I18N,
} from "@/lib/i18n/dictionary";
import {
  DEFAULT_LOCALE,
  LOCALES,
  LOCALE_TAG,
  localePath,
  type Locale,
} from "@/lib/i18n/config";

function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

const abs = (path: string) => `${SITE_URL}${path}`;

/** Sitewide AutoDealer/Organization schema (rendered once in the site layout). */
export function OrganizationJsonLd() {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "AutoDealer",
        "@id": `${SITE_URL}/#dealer`,
        name: DEALER.name,
        url: SITE_URL,
        logo: `${SITE_URL}/brand/autocar-logo.png`,
        image: `${SITE_URL}/brand/og.jpg`,
        email: DEALER.email,
        telephone: DEALER.whatsappDePretty,
        foundingDate: String(DEALER.since),
        sameAs: [DEALER.facebook],
        areaServed: ["DE", "AT", "HR"],
        // TODO: add a real PostalAddress once the dealership's registered
        // address is available — it's the strongest local-SEO signal there is
        // and Google treats an AutoDealer without one as incomplete.
        knowsLanguage: LOCALES.map((l) => LOCALE_TAG[l]),
        contactPoint: [
          {
            "@type": "ContactPoint",
            contactType: "sales",
            telephone: DEALER.whatsappDePretty,
            email: DEALER.email,
            areaServed: ["DE", "AT"],
            availableLanguage: LOCALES.map((l) => LOCALE_TAG[l]),
          },
          {
            "@type": "ContactPoint",
            contactType: "customer support",
            telephone: DEALER.whatsappHrPretty,
            areaServed: ["HR"],
            availableLanguage: [LOCALE_TAG.hr],
          },
        ],
      }}
    />
  );
}

/**
 * BreadcrumbList for a page. `trail` excludes the home crumb, which is always
 * prepended. Paths are app-relative; the locale prefix is applied here.
 */
export function BreadcrumbJsonLd({
  locale,
  trail,
  homeName = "AUTOCAR EU",
}: {
  locale: Locale;
  trail: { name: string; path: string }[];
  homeName?: string;
}) {
  const items = [{ name: homeName, path: "/" }, ...trail];

  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map((item, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: item.name,
          item: abs(localePath(locale, item.path)),
        })),
      }}
    />
  );
}

/** Vehicle + Offer schema for a car detail page. */
export function VehicleJsonLd({
  car,
  locale = DEFAULT_LOCALE,
}: {
  car: CarWithRelations;
  locale?: Locale;
}) {
  const [regMonth, regYear] = car.firstRegistration.split("/");
  const url = abs(localePath(locale, `/vozila/${car.slug}`));

  // Prices are reviewed on every inventory refresh; a year out keeps the offer
  // from being read as stale without implying a longer commitment than that.
  const priceValidUntil = new Date(car.updatedAt);
  priceValidUntil.setFullYear(priceValidUntil.getFullYear() + 1);

  // Labels follow the page's own language — previously these were pinned to
  // Croatian, so a German page shipped "Benzin"/"Automatski" to Google.
  const doors = car.doors ? Number(car.doors.split("/").pop()) : undefined;

  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "Car",
        name: car.title,
        brand: { "@type": "Brand", name: car.brand },
        model: car.model,
        url,
        image: car.images.map((i) => i.url),
        ...(car.description ? { description: car.description } : {}),
        vehicleModelDate: regYear,
        productionDate: regYear && regMonth ? `${regYear}-${regMonth}` : undefined,
        bodyType: BODY_TYPE_LABEL_I18N[locale][car.bodyType],
        mileageFromOdometer: {
          "@type": "QuantitativeValue",
          value: car.mileageKm,
          unitCode: "KMT",
        },
        fuelType: FUEL_LABEL_I18N[locale][car.fuelType],
        vehicleTransmission: TRANSMISSION_LABEL_I18N[locale][car.transmission],
        vehicleEngine: {
          "@type": "EngineSpecification",
          fuelType: FUEL_LABEL_I18N[locale][car.fuelType],
          enginePower: {
            "@type": "QuantitativeValue",
            value: car.powerKw,
            unitCode: "KWT",
          },
          ...(car.engineCcm
            ? {
                engineDisplacement: {
                  "@type": "QuantitativeValue",
                  value: car.engineCcm,
                  unitCode: "CMQ",
                },
              }
            : {}),
        },
        ...(doors && Number.isFinite(doors) ? { numberOfDoors: doors } : {}),
        ...(car.seats ? { seatingCapacity: car.seats } : {}),
        ...(car.previousOwners !== null && car.previousOwners !== undefined
          ? { numberOfPreviousOwners: car.previousOwners }
          : {}),
        ...(car.emissionClass
          ? { meetsEmissionStandard: car.emissionClass }
          : {}),
        itemCondition: "https://schema.org/UsedCondition",
        offers: {
          "@type": "Offer",
          url,
          price: car.priceEur,
          priceCurrency: "EUR",
          priceValidUntil: priceValidUntil.toISOString().slice(0, 10),
          availability: "https://schema.org/InStock",
          itemCondition: "https://schema.org/UsedCondition",
          seller: {
            "@type": "AutoDealer",
            "@id": `${SITE_URL}/#dealer`,
            name: DEALER.name,
            url: SITE_URL,
          },
        },
      }}
    />
  );
}
