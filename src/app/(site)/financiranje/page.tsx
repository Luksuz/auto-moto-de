import type { Metadata } from "next";
import { Check, Phone, Target, Zap } from "lucide-react";
import { getT } from "@/lib/i18n/server";
import { getCarBySlug } from "@/lib/cars";
import { FinancingForm } from "@/components/site/forms/financing-form";

export const metadata: Metadata = {
  title: "Financiranje — AUTOCAR EU",
  description:
    "Pošaljite upit za financiranje vozila — najpovoljniji uvjeti za sve zaposlene u Njemačkoj i Austriji, brza obrada zahtjeva.",
};

export default async function FinanciranjePage({
  searchParams,
}: {
  searchParams: Promise<{ car?: string | string[] }>;
}) {
  const { t } = await getT();

  const { car: carParam } = await searchParams;
  const carSlug = typeof carParam === "string" ? carParam : undefined;
  const car = carSlug ? await getCarBySlug(carSlug) : null;
  const prefill: {
    carId?: string;
    vehicle?: string;
    year?: string;
    price?: string;
  } =
    car && car.published
      ? {
          carId: car.id,
          vehicle: car.title,
          year: car.firstRegistration.split("/")[1],
          price: String(car.priceEur),
        }
      : {};

  const usps = [t.finUsp1, t.finUsp2, t.finUsp3];
  const benefits = [
    { icon: Check, title: t.finB1, text: t.finB1t },
    { icon: Target, title: t.finB2, text: t.finB2t },
    { icon: Zap, title: t.finB3, text: t.finB3t },
    { icon: Phone, title: t.finB4, text: t.finB4t },
  ];

  return (
    <div>
      <div className="border-b border-border-soft bg-gradient-to-b from-[#121013] to-background px-5 pb-10 pt-14 text-center sm:px-10 lg:px-14">
        <div className="mb-3 font-display text-[12px] uppercase tracking-[4px] text-primary">
          {t.finKicker}
        </div>
        <h1 className="mb-3.5 font-display text-[clamp(28px,6vw,42px)] font-semibold uppercase">
          {t.finTitle}
        </h1>
        <p className="mx-auto max-w-[640px] text-[17px] leading-[1.6] text-muted">
          {t.finText}
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-10">
          {usps.map((usp) => (
            <div
              key={usp}
              className="flex items-center gap-2.5 text-[14px] font-semibold"
            >
              <span className="text-primary">◈</span> {usp}
            </div>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-[860px] px-5 pb-16 pt-11 sm:px-8">
        <FinancingForm {...prefill} />

        <div className="mt-7 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {benefits.map(({ icon: Icon, title, text }) => (
            <div key={title} className="border border-border p-5 text-center">
              <Icon className="mx-auto size-6 text-primary" />
              <div className="mt-2 mb-1 font-display text-[14px] font-semibold uppercase">
                {title}
              </div>
              <div className="text-[13px] leading-[1.5] text-muted-2">
                {text}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
