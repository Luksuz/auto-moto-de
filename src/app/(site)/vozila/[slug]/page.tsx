import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check } from "lucide-react";
import { getCarBySlug, getSimilarCars, primaryImage } from "@/lib/cars";
import type { CarWithRelations } from "@/lib/cars";
import { CarCard } from "@/components/car/car-card";
import { CarGallery } from "@/components/car/car-gallery";
import { CarDescription } from "@/components/car/car-description";
import { VehicleJsonLd } from "@/components/site/structured-data";
import { Button } from "@/components/ui/button";
import { formatPrice, formatKm, estimateMonthlyRate, fmtDate } from "@/lib/utils";
import { DEALER, whatsappLink } from "@/lib/constants";
import { getT } from "@/lib/i18n/server";
import {
  FUEL_LABEL_I18N,
  TRANSMISSION_LABEL_I18N,
  BODY_TYPE_LABEL_I18N,
  type Dict,
} from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/config";
import { WhatsAppIcon } from "@/components/site/icons";

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const car = await getCarBySlug(slug);

  if (!car || !car.published) {
    return { title: "Vozilo nije pronađeno — AUTOCAR EU" };
  }

  const img = primaryImage(car);
  const description = car.description
    ? car.description.replace(/\s+/g, " ").trim().slice(0, 160)
    : `${car.title} — ${formatPrice(car.priceEur)}, ${car.firstRegistration}, ${formatKm(
        car.mileageKm,
      )}. Provjerena vozila iz Njemačke i Austrije uz mogućnost financiranja.`;

  return {
    title: `${car.title} — ${formatPrice(car.priceEur)}`,
    description,
    alternates: { canonical: `/vozila/${car.slug}` },
    openGraph: {
      title: car.title,
      description,
      images: img ? [{ url: img }] : undefined,
    },
  };
}

type TechRow = { label: string; value: string };

function buildTechRows(
  car: CarWithRelations,
  t: Dict,
  locale: Locale,
): TechRow[] {
  const rows: TechRow[] = [];
  const push = (label: string, value: string | number | null | undefined) => {
    if (value === null || value === undefined || value === "") return;
    rows.push({ label, value: String(value) });
  };

  push(t.firstReg, car.firstRegistration);
  push(t.mileage, formatKm(car.mileageKm));
  push(t.fuel, FUEL_LABEL_I18N[locale][car.fuelType]);
  push(t.gearbox, TRANSMISSION_LABEL_I18N[locale][car.transmission]);
  push(t.power, `${car.powerKw} kW (${car.powerKs} KS)`);
  push(t.emission, car.emissionClass);
  push(t.tBrand, car.brand);
  push(t.tModel, car.model);
  push(t.tBodyType, BODY_TYPE_LABEL_I18N[locale][car.bodyType]);
  push(t.tEngine, car.engineCcm ? `${car.engineCcm} ccm` : null);
  push(t.tDoors, car.doors);
  push(t.tSeats, car.seats);
  push(t.tAC, car.airConditioning);
  push(t.tParking, car.parkingSensors);
  push(t.tTuv, car.tuv);
  push(t.tOrigin, car.origin);
  push(t.tOwners, car.previousOwners);

  return rows;
}

const PANEL_CLASS = "mt-[30px] border border-border p-[26px]";
const PANEL_HEADING_CLASS =
  "mb-[18px] font-display text-[17px] font-semibold uppercase tracking-[2px] text-primary";

export default async function CarDetailPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const car = await getCarBySlug(slug);

  if (!car || !car.published) notFound();

  const { t, locale } = await getT();
  const similar = await getSimilarCars(car, 4);

  const techRows = buildTechRows(car, t, locale);
  const year = car.firstRegistration.split("/")[1];
  const meta = [
    year,
    formatKm(car.mileageKm),
    FUEL_LABEL_I18N[locale][car.fuelType],
    TRANSMISSION_LABEL_I18N[locale][car.transmission],
  ].join(" · ");

  const inquiry =
    locale === "de"
      ? `Hallo, ich interessiere mich für: ${car.title} (${formatPrice(car.priceEur)})`
      : `Pozdrav, zanima me vozilo: ${car.title} (${formatPrice(car.priceEur)})`;

  const hasOrigin = Boolean(car.origin?.trim() || car.originDetails?.trim());

  return (
    <div className="px-5 py-11 sm:px-10 lg:px-14">
      <VehicleJsonLd car={car} />
      <Link
        href="/vozila"
        className="mb-6 inline-block text-[14px] font-semibold uppercase tracking-[1.5px] text-muted-2 hover:text-primary"
      >
        ← {t.backToCars}
      </Link>

      <div className="grid grid-cols-1 items-start gap-[34px] lg:grid-cols-[1.25fr_.75fr]">
        {/* Left: gallery + stacked panels */}
        <div>
          <CarGallery
            images={car.images}
            title={car.title}
            emptyLabel={t.noPhotos}
          />

          {techRows.length > 0 && (
            <section className={PANEL_CLASS}>
              <h2 className={PANEL_HEADING_CLASS}>{t.techDetails}</h2>
              <div className="grid gap-x-[22px] gap-y-4 text-[14.5px] [grid-template-columns:repeat(auto-fit,minmax(140px,1fr))]">
                {techRows.map((row) => (
                  <div key={row.label}>
                    <div className="text-[12px] uppercase tracking-[1.5px] text-muted-2">
                      {row.label}
                    </div>
                    <div className="mt-[3px] font-semibold">{row.value}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <p className="text-[13px] text-muted">
            {t.carUpdated}:{" "}
            <time dateTime={car.updatedAt.toISOString()}>
              {fmtDate(car.updatedAt, locale)}
            </time>
          </p>

          {car.description?.trim() && (
            <section className={PANEL_CLASS}>
              <h2 className={PANEL_HEADING_CLASS}>{t.descTitle}</h2>
              <CarDescription text={car.description} />
            </section>
          )}

          {car.equipment.length > 0 && (
            <section className={PANEL_CLASS}>
              <h2 className={PANEL_HEADING_CLASS}>{t.equipTitle}</h2>
              <ul className="grid grid-cols-1 gap-x-[22px] gap-y-2.5 text-[14.5px] sm:grid-cols-2 lg:grid-cols-3">
                {car.equipment.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {car.warranty?.trim() && (
            <section className={PANEL_CLASS}>
              <h2 className={PANEL_HEADING_CLASS}>{t.warrantyTitle}</h2>
              <div className="whitespace-pre-line text-[14.5px] leading-relaxed text-muted">
                {car.warranty}
              </div>
            </section>
          )}

          {hasOrigin && (
            <section className={PANEL_CLASS}>
              <h2 className={PANEL_HEADING_CLASS}>{t.originTitle}</h2>
              <div className="space-y-3 text-[14.5px] leading-relaxed">
                {car.origin?.trim() && (
                  <p className="font-semibold">{car.origin}</p>
                )}
                {car.originDetails?.trim() && (
                  <div className="whitespace-pre-line text-muted">
                    {car.originDetails}
                  </div>
                )}
              </div>
            </section>
          )}
        </div>

        {/* Right: sticky buy card */}
        <div className="border border-border bg-surface p-7 lg:sticky lg:top-24">
          <h1 className="mb-2 font-display text-[27px] font-semibold uppercase">
            {car.title}
          </h1>
          <div className="mb-5 text-[14px] text-muted-2">{meta}</div>
          <div className="mb-1 font-display text-[38px] text-primary">
            {formatPrice(car.priceEur)}
          </div>
          <div className="mb-6 text-[15px] font-semibold text-success">
            {t.finRate} {formatPrice(estimateMonthlyRate(car.priceEur))}/{t.month}
          </div>

          <div className="flex flex-col gap-2.5">
            <Button asChild variant="whatsapp" size="lg" className="w-full font-bold text-[15.5px]">
              <a
                href={whatsappLink(inquiry, DEALER.whatsappDe)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <WhatsAppIcon className="size-4" />
                WhatsApp DE {DEALER.whatsappDePretty}
              </a>
            </Button>
            <Button asChild variant="whatsappDark" size="lg" className="w-full font-bold text-[15.5px]">
              <a
                href={whatsappLink(inquiry, DEALER.whatsappHr)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <WhatsAppIcon className="size-4" />
                WhatsApp HR {DEALER.whatsappHrPretty}
              </a>
            </Button>
            <Button asChild variant="goldOutline" size="lg" className="w-full text-[14px]">
              <Link href={`/financiranje?car=${car.slug}`}>{t.reqFinancing}</Link>
            </Button>
          </div>

          <div className="mt-4 text-center text-[13px] text-muted-2">
            {t.warrantyNote}
          </div>
        </div>
      </div>

      {/* Similar cars */}
      {similar.length > 0 && (
        <section className="mt-14">
          <h2 className="mb-6 font-display text-[24px] font-semibold uppercase tracking-[1px]">
            {t.similarCars}
          </h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {similar.map((c) => (
              <CarCard
                key={c.id}
                car={c}
                locale={locale}
                detailsLabel={t.details}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
