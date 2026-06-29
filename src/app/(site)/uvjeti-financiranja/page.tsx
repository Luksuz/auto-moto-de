import type { Metadata } from "next";
import Link from "next/link";
import { Check, Percent, ShieldCheck, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LeadForm } from "@/components/site/lead-form";
import { DEALER, FINANCING } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Uvjeti financiranja — KupiAuto.de",
  description:
    "Financiranje vozila uz kamatu od 5,99% do 8,99%, 0% učešća i odobrenje banke unutar jednog radnog dana.",
};

function rate(value: number): string {
  return value.toFixed(2).replace(".", ",");
}

const CONDITIONS = [
  "Punoljetnost (navršenih 18 godina)",
  "Najmanje 3 mjeseca kod trenutnog poslodavca u Njemačkoj",
  "Više od 12 mjeseci boravka u Njemačkoj",
  "Njemački bankovni račun (IBAN)",
  "EU dokumenti ili Aufenthaltstitel / Fiktionsbescheinigung",
];

export default function UvjetiFinanciranjaPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <header className="max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">
          Financiranje
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          Uvjeti financiranja
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-muted">
          Financiranje provodimo 100% online uz povoljne kamatne stope i bez
          obaveznog učešća. Odobrenje banke dobivate unutar jednog radnog dana.
        </p>
      </header>

      {/* Highlights */}
      <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <Percent className="size-7 text-primary" />
          <p className="mt-3 text-2xl font-extrabold text-foreground">
            {rate(FINANCING.minRate)}% – {rate(FINANCING.maxRate)}%
          </p>
          <p className="mt-1 text-sm text-muted">Kamatna stopa (ovisno o profilu)</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <ShieldCheck className="size-7 text-primary" />
          <p className="mt-3 text-2xl font-extrabold text-foreground">0 €</p>
          <p className="mt-1 text-sm text-muted">Učešće nije obavezno</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <Info className="size-7 text-primary" />
          <p className="mt-3 text-2xl font-extrabold text-foreground">
            {FINANCING.approvalHours}h
          </p>
          <p className="mt-1 text-sm text-muted">
            Odobrenje unutar 1 radnog dana
          </p>
        </div>
      </div>

      {/* Conditions */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground">
          Uvjeti za odobrenje
        </h2>
        <p className="mt-2 text-muted">
          Za odobrenje financiranja potrebno je ispuniti sljedeće uvjete:
        </p>
        <ul className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {CONDITIONS.map((c) => (
            <li
              key={c}
              className="flex items-start gap-2.5 rounded-xl border border-border bg-surface p-4 text-sm text-foreground shadow-sm"
            >
              <Check className="mt-0.5 size-4 shrink-0 text-success" />
              <span>{c}</span>
            </li>
          ))}
        </ul>

        <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <Info className="mt-0.5 size-4 shrink-0" />
          <span>
            <strong>Napomena:</strong> ulazne vize ne kvalificiraju za
            financiranje. Potrebni su EU dokumenti odnosno Aufenthaltstitel ili
            Fiktionsbescheinigung.
          </span>
        </div>
      </section>

      {/* Insurance */}
      <section className="mt-12 rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-8">
        <h2 className="text-xl font-bold text-foreground">Osiguranje vozila</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          U suradnji s partnerom <strong>Osigurajse24.de</strong> organiziramo
          kompletno osiguranje vašeg vozila — Kasko i obavezno osiguranje — kako
          biste vozilo mogli preuzeti spremno za vožnju.
        </p>
      </section>

      {/* Required docs note */}
      <section className="mt-8 rounded-2xl border border-border bg-surface-2 p-6 text-sm text-muted">
        <p className="font-semibold text-foreground">Potrebna dokumentacija</p>
        <p className="mt-2">
          2 zadnje platne liste, osobni dokument, IBAN njemačkog računa te
          prijava prebivališta u Njemačkoj (Anmeldung). Cijeli zahtjev
          ispunjavate online.
        </p>
      </section>

      {/* CTA */}
      <div className="mt-12 flex flex-col gap-3 rounded-2xl bg-navy p-8 text-white sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold">Zatražite financiranje</h2>
          <p className="mt-1 text-white/70">
            Pošaljite zahtjev — javljamo se unutar jednog radnog dana.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-3">
          <LeadForm
            type="FINANCING"
            triggerLabel="Zatraži financiranje"
            triggerVariant="accent"
            triggerSize="lg"
          />
          <Button
            asChild
            variant="outline"
            size="lg"
            className="border-white/20 bg-transparent text-white hover:bg-white/10"
          >
            <Link href="/vozila">Pogledaj vozila</Link>
          </Button>
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-muted">
        Informativni primjer: rok od {FINANCING.exampleMonths} mjeseci uz kamatu{" "}
        {rate(FINANCING.exampleRate)}% i učešće 0 €. Konačni uvjeti ovise o
        odobrenju banke i odabranom vozilu. Za detalje nas kontaktirajte na{" "}
        {DEALER.phone}.
      </p>
    </div>
  );
}
