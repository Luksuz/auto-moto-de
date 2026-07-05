import type { Metadata } from "next";
import Link from "next/link";
import { Check, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DEALER, whatsappLink } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Tijek preuzimanja — AUTOCAR EU",
  description:
    "Kako izgleda preuzimanje vozila — od dogovorenog termina do predaje ključeva.",
};

const STEPS = [
  {
    title: "Dolazak na preuzimanje",
    text: "Dolazite u dogovoreno vrijeme na dogovorenu lokaciju. Ponesite osobni dokument i dokumentaciju vezanu uz financiranje.",
  },
  {
    title: "Pregled vozila",
    text: "Zajedno detaljno pregledavamo vozilo, opremu i stanje te odgovaramo na sva preostala pitanja.",
  },
  {
    title: "Dokumentacija i osiguranje",
    text: "Provjeravamo da su osiguranje (Kasko + obavezno) i registracija vozila (Kfz-Zulassung) uredno pripremljeni.",
  },
  {
    title: "Potpis i predaja ključeva",
    text: "Potpisujete ugovor i preuzimate ključeve. Vozilo je spremno za vožnju.",
  },
];

export default function TijekPreuzimanjaPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-12 sm:px-10 lg:px-14 lg:py-16">
      <h1 className="font-display text-[clamp(28px,6vw,40px)] font-semibold uppercase text-foreground">
        Tijek preuzimanja
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-muted">
        Preuzimanje vozila brzo je i jednostavno. U nastavku je pregled kako
        izgleda dan kada dolazite po svoj automobil.
      </p>

      <ol className="mt-10 space-y-4">
        {STEPS.map((step, i) => (
          <li
            key={step.title}
            className="flex gap-4 border border-border bg-surface p-6"
          >
            <span className="grid size-10 shrink-0 place-items-center bg-primary font-display text-base font-semibold text-primary-foreground">
              {i + 1}
            </span>
            <div>
              <h2 className="flex items-center gap-2 font-display text-lg font-semibold uppercase tracking-[1px] text-foreground">
                {step.title}
                <Check className="size-4 text-primary" />
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">
                {step.text}
              </p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <Button asChild variant="primary" size="lg">
          <Link href="/termin-za-preuzimanje">Dogovori termin</Link>
        </Button>
        <Button asChild variant="whatsapp" size="lg">
          <a
            href={whatsappLink()}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Phone className="size-4" />
            WhatsApp {DEALER.whatsappDePretty}
          </a>
        </Button>
      </div>
    </div>
  );
}
