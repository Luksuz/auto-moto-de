import type { Metadata } from "next";
import Link from "next/link";
import {
  MessageSquare,
  FileText,
  KeyRound,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DEALER, FINANCING } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Postupak kupnje — KupiAuto.de",
  description:
    "Tri jednostavna koraka do vašeg vozila: informativni razgovor, online zahtjev za financiranjem i preuzimanje vozila.",
};

const STEPS = [
  {
    icon: MessageSquare,
    title: "Informativni razgovor",
    text: "Odaberete vozilo koje vas zanima i javite nam se telefonom, putem WhatsAppa ili obrasca. Odgovaramo na sva pitanja, dogovaramo detalje i provjeravamo dostupnost vozila.",
    bullets: [
      "Pregled dostupnih vozila i specifikacija",
      "Provjera mogućnosti financiranja",
      "Dogovor sljedećih koraka",
    ],
  },
  {
    icon: FileText,
    title: "Online zahtjev za financiranjem",
    text: "Zahtjev za financiranjem ispunjavate u potpunosti online. Potrebnu dokumentaciju šaljete nam digitalno, a odobrenje banke dobivate brzo.",
    bullets: [
      "2 zadnje platne liste",
      "Osobni dokument (osobna iskaznica ili putovnica)",
      "IBAN njemačkog bankovnog računa",
      "Prijava prebivališta u Njemačkoj (Anmeldung)",
      `Odobrenje banke unutar 1 radnog dana`,
    ],
  },
  {
    icon: KeyRound,
    title: "Prijepis i preuzimanje vozila",
    text: "Nakon odobrenja organiziramo osiguranje i registraciju vozila. Vozilo preuzimate u našem salonu spremno za vožnju.",
    bullets: [
      "Ugovaranje osiguranja (Kasko + obavezno)",
      "Registracija vozila (Kfz-Zulassung)",
      "Dolazak u salon i preuzimanje ključeva",
    ],
  },
];

export default function PostupakKupnjePage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <header className="max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">
          Postupak kupnje
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          Do vašeg vozila u 3 koraka
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-muted">
          Kupnja kod nas jednostavna je i transparentna — od prvog razgovora do
          preuzimanja ključeva vodimo vas kroz svaki korak.
        </p>
      </header>

      <ol className="mt-12 space-y-6">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          return (
            <li
              key={step.title}
              className="relative rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-8"
            >
              <div className="flex flex-col gap-5 sm:flex-row">
                <div className="flex shrink-0 items-start gap-4">
                  <span className="grid size-12 place-items-center rounded-xl bg-primary text-lg font-extrabold text-primary-foreground">
                    {i + 1}
                  </span>
                  <Icon className="mt-2.5 size-6 text-primary sm:hidden" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Icon className="hidden size-5 text-primary sm:block" />
                    <h2 className="text-xl font-bold text-foreground">
                      {step.title}
                    </h2>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    {step.text}
                  </p>
                  <ul className="mt-4 space-y-2">
                    {step.bullets.map((b) => (
                      <li
                        key={b}
                        className="flex items-start gap-2 text-sm text-foreground"
                      >
                        <Check className="mt-0.5 size-4 shrink-0 text-success" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-12 rounded-2xl border border-border bg-surface-2 p-6 text-sm text-muted">
        <p>
          Odobrenje financiranja u pravilu dobivate unutar{" "}
          {FINANCING.approvalHours} sata. Za sva pitanja stojimo vam na
          raspolaganju na hrvatskom jeziku.
        </p>
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button asChild variant="accent" size="lg">
          <Link href="/uvjeti-financiranja">Uvjeti financiranja</Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <a href={`tel:${DEALER.phoneHref}`}>Nazovi: {DEALER.phone}</a>
        </Button>
      </div>
    </div>
  );
}
