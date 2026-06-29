import type { Metadata } from "next";
import { Phone, Clock, MapPin } from "lucide-react";
import { LeadForm } from "@/components/site/lead-form";
import { Button } from "@/components/ui/button";
import { DEALER } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Termin za preuzimanje — KupiAuto.de",
  description:
    "Dogovorite termin za preuzimanje vozila u našem salonu — KupiAuto.de (LON CARS).",
};

export default function TerminZaPreuzimanjePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
        Termin za preuzimanje
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-muted">
        Nakon odobrenja financiranja i pripreme dokumentacije, dogovaramo termin
        za preuzimanje vozila u našem salonu. Javite nam se kako bismo odabrali
        termin koji vam najviše odgovara.
      </p>

      <section className="mt-10 rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-8">
        <h2 className="text-xl font-bold text-foreground">Lokacija salona</h2>
        <ul className="mt-4 space-y-3 text-sm">
          <li className="flex items-start gap-2.5">
            <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
            <span className="text-foreground/90">
              {DEALER.legalName}
              <br />
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
          <li className="flex items-center gap-2.5">
            <Phone className="size-4 shrink-0 text-primary" />
            <a
              href={`tel:${DEALER.phoneHref}`}
              className="font-medium text-foreground hover:text-primary"
            >
              {DEALER.phone}
            </a>
          </li>
        </ul>
      </section>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <LeadForm
          type="VIEWING"
          triggerLabel="Zakaži termin"
          triggerVariant="accent"
          triggerSize="lg"
        />
        <Button asChild variant="outline" size="lg">
          <a href={`tel:${DEALER.phoneHref}`}>Nazovi: {DEALER.phone}</a>
        </Button>
      </div>
    </div>
  );
}
