import { DEALER, SITE_URL } from "@/lib/constants";
import type { CarWithRelations } from "@/lib/cars";
import { FUEL_LABEL_I18N, TRANSMISSION_LABEL_I18N } from "@/lib/i18n/dictionary";

function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

/** Sitewide AutoDealer/Organization schema (rendered once in the site layout). */
export function OrganizationJsonLd() {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "AutoDealer",
        name: DEALER.name,
        url: SITE_URL,
        logo: `${SITE_URL}/brand/autocar-logo.png`,
        email: DEALER.email,
        telephone: DEALER.whatsappDePretty,
        foundingDate: String(DEALER.since),
        sameAs: [DEALER.facebook],
        areaServed: ["DE", "AT", "HR"],
      }}
    />
  );
}

/** Vehicle + Offer schema for a car detail page. */
export function VehicleJsonLd({ car }: { car: CarWithRelations }) {
  const [regMonth, regYear] = car.firstRegistration.split("/");

  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "Car",
        name: car.title,
        brand: { "@type": "Brand", name: car.brand },
        model: car.model,
        url: `${SITE_URL}/vozila/${car.slug}`,
        image: car.images.map((i) => i.url),
        vehicleModelDate: regYear,
        productionDate: regYear && regMonth ? `${regYear}-${regMonth}` : undefined,
        mileageFromOdometer: {
          "@type": "QuantitativeValue",
          value: car.mileageKm,
          unitCode: "KMT",
        },
        fuelType: FUEL_LABEL_I18N.hr[car.fuelType],
        vehicleTransmission: TRANSMISSION_LABEL_I18N.hr[car.transmission],
        vehicleEngine: {
          "@type": "EngineSpecification",
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
        ...(car.seats ? { seatingCapacity: car.seats } : {}),
        ...(car.emissionClass
          ? { meetsEmissionStandard: car.emissionClass }
          : {}),
        itemCondition: "https://schema.org/UsedCondition",
        offers: {
          "@type": "Offer",
          price: car.priceEur,
          priceCurrency: "EUR",
          availability: "https://schema.org/InStock",
          itemCondition: "https://schema.org/UsedCondition",
          seller: { "@type": "AutoDealer", name: DEALER.name, url: SITE_URL },
        },
      }}
    />
  );
}
