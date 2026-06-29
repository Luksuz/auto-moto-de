import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Calendar,
  Gauge,
  Fuel,
  Cog,
  Zap,
  Phone,
  Mail,
  Clock,
  MapPin,
  ChevronRight,
  User as UserIcon,
  MessageCircle,
} from "lucide-react";
import { getCarBySlug, getSimilarCars, primaryImage } from "@/lib/cars";
import { CarCard } from "@/components/car/car-card";
import { CarGallery } from "@/components/car/car-gallery";
import { CarSpecTabs } from "@/components/car/car-spec-tabs";
import { LeadForm } from "@/components/site/lead-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatPrice, formatKm } from "@/lib/utils";
import {
  DEALER,
  FINANCING,
  PRICE_RATING_LABEL,
  FUEL_TYPE_LABEL,
  TRANSMISSION_LABEL,
  BODY_TYPE_LABEL,
  whatsappLink,
} from "@/lib/constants";

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const car = await getCarBySlug(slug);

  if (!car || !car.published) {
    return { title: "Vozilo nije pronađeno — KupiAuto.de" };
  }

  const img = primaryImage(car);
  const description = car.description
    ? car.description.slice(0, 160)
    : `${car.title} — ${formatPrice(car.priceEur)}, ${car.firstRegistration}, ${formatKm(
        car.mileageKm,
      )}. Financiranje 100% online uz 0% učešća.`;

  return {
    title: `${car.title} — ${formatPrice(car.priceEur)} | KupiAuto.de`,
    description,
    openGraph: {
      title: car.title,
      description,
      images: img ? [{ url: img }] : undefined,
    },
  };
}

/** Standard annuity formula: monthly payment for a loan. */
function monthlyEstimate(
  principal: number,
  annualRatePct: number,
  months: number,
): number {
  const r = annualRatePct / 100 / 12;
  if (r === 0) return principal / months;
  return (principal * r) / (1 - Math.pow(1 + r, -months));
}

export default async function CarDetailPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const car = await getCarBySlug(slug);

  if (!car || !car.published) notFound();

  const similar = await getSimilarCars(car, 4);

  const monthly = Math.round(
    monthlyEstimate(car.priceEur, FINANCING.exampleRate, FINANCING.exampleMonths),
  );

  const agent = car.assignedAgent;
  const agentName = agent?.name ?? DEALER.agent;
  const agentPhone = agent?.phone ?? DEALER.phone;
  const agentPhoneHref = (agent?.phone ?? DEALER.phone).replace(/[^\d+]/g, "");
  const agentEmail = agent?.email ?? DEALER.email;

  const waText = `Pozdrav, zanima me vozilo ${car.title} (${formatPrice(
    car.priceEur,
  )}).`;

  const chips = [
    { icon: Calendar, value: car.firstRegistration },
    { icon: Gauge, value: formatKm(car.mileageKm) },
    { icon: Fuel, value: FUEL_TYPE_LABEL[car.fuelType] },
    { icon: Cog, value: TRANSMISSION_LABEL[car.transmission] },
    { icon: Zap, value: `${car.powerKw} kW (${car.powerKs} KS)` },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      {/* Breadcrumb */}
      <nav className="mb-5 flex items-center gap-1.5 text-sm text-muted">
        <Link href="/" className="hover:text-foreground">
          Naslovnica
        </Link>
        <ChevronRight className="size-3.5" />
        <Link href="/vozila" className="hover:text-foreground">
          Vozila
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="truncate text-foreground">{car.title}</span>
      </nav>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.6fr_1fr]">
        {/* Left column */}
        <div className="space-y-8">
          <CarGallery images={car.images} title={car.title} />

          {/* Title block (mobile shows here under gallery) */}
          <div className="lg:hidden">
            <TitleBlock
              car={car}
              chips={chips}
              monthly={monthly}
            />
          </div>

          {car.description && (
            <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
              <h2 className="mb-3 text-lg font-bold text-foreground">Opis</h2>
              <div className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">
                {car.description}
              </div>
            </section>
          )}

          <CarSpecTabs car={car} />
        </div>

        {/* Right column (sticky) */}
        <div className="space-y-6">
          <div className="hidden lg:block">
            <TitleBlock car={car} chips={chips} monthly={monthly} />
          </div>

          {/* CTA card */}
          <Card>
            <CardContent className="space-y-2.5">
              <LeadForm
                carId={car.id}
                type="FINANCING"
                triggerLabel="Zatraži financiranje"
                triggerVariant="accent"
                triggerSize="lg"
                triggerClassName="w-full"
              />
              <LeadForm
                carId={car.id}
                type="VIEWING"
                triggerLabel="Zakaži razgledavanje"
                triggerVariant="navy"
                triggerSize="lg"
                triggerClassName="w-full"
              />
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <Button asChild variant="whatsapp" size="lg">
                  <a
                    href={whatsappLink(waText)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MessageCircle className="size-4" />
                    WhatsApp
                  </a>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <a href={`tel:${agentPhoneHref}`}>
                    <Phone className="size-4" />
                    Nazovi
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Agent card */}
          <Card>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="grid size-12 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                  <UserIcon className="size-6" />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-muted">
                    Vaš prodajni savjetnik
                  </p>
                  <p className="text-base font-bold text-foreground">
                    {agentName}
                  </p>
                  <p className="text-sm text-muted">{DEALER.legalName}</p>
                </div>
              </div>

              <ul className="mt-4 space-y-2.5 border-t border-border pt-4 text-sm">
                <li className="flex items-center gap-2.5">
                  <Phone className="size-4 shrink-0 text-primary" />
                  <a
                    href={`tel:${agentPhoneHref}`}
                    className="font-medium text-foreground hover:text-primary"
                  >
                    {agentPhone}
                  </a>
                </li>
                <li className="flex items-center gap-2.5">
                  <Mail className="size-4 shrink-0 text-primary" />
                  <a
                    href={`mailto:${agentEmail}`}
                    className="font-medium text-foreground hover:text-primary"
                  >
                    {agentEmail}
                  </a>
                </li>
                <li className="flex items-start gap-2.5">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span className="text-foreground/90">
                    {DEALER.street}, {DEALER.city}
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Clock className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span className="text-foreground/90">
                    Pon–Pet: {DEALER.hoursWeek}
                    <br />
                    Sub: {DEALER.hoursSat}
                  </span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Similar cars */}
      {similar.length > 0 && (
        <section className="mt-14">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
              Slična vozila
            </h2>
            <Link
              href="/vozila"
              className="text-sm font-semibold text-primary hover:underline"
            >
              Sva vozila
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {similar.map((c) => (
              <CarCard key={c.id} car={c} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function TitleBlock({
  car,
  chips,
  monthly,
}: {
  car: Awaited<ReturnType<typeof getCarBySlug>> & object;
  chips: { icon: React.ElementType; value: string }[];
  monthly: number;
}) {
  if (!car) return null;
  return (
    <div>
      <span className="text-[11px] font-semibold uppercase tracking-wide text-primary">
        {BODY_TYPE_LABEL[car.bodyType]}
      </span>
      <h1 className="mt-1 text-2xl font-extrabold leading-tight tracking-tight text-foreground sm:text-3xl">
        {car.title}
      </h1>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span className="text-3xl font-extrabold text-navy">
          {formatPrice(car.priceEur)}
        </span>
        {car.priceRating && (
          <Badge variant="rating" className="bg-rating text-white">
            {PRICE_RATING_LABEL[car.priceRating]}
          </Badge>
        )}
      </div>

      {/* Financing line */}
      <p className="mt-2 text-sm text-muted">
        Već od{" "}
        <span className="font-bold text-foreground">
          {formatPrice(monthly)}/mj
        </span>{" "}
        uz rok od {FINANCING.exampleMonths} mjeseci, kamata{" "}
        {formatRateInline(FINANCING.exampleRate)}%, učešće{" "}
        {formatPrice(FINANCING.downPayment)}.
      </p>

      {/* Key spec chips */}
      <div className="mt-5 flex flex-wrap gap-2">
        {chips.map((chip, i) => {
          const Icon = chip.icon;
          return (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-xs font-medium text-foreground"
            >
              <Icon className="size-3.5 text-primary" />
              {chip.value}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function formatRateInline(value: number): string {
  return value.toFixed(2).replace(".", ",");
}
