import type { Metadata } from "next";
import { DEALER } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Impressum — KupiAuto.de",
  description: "Pravne informacije i podaci o tvrtki KupiAuto.de (LON CARS).",
};

export default function ImpressumPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
        Impressum
      </h1>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-foreground/90">
        <section>
          <h2 className="text-base font-bold text-foreground">
            Podaci o pružatelju usluge
          </h2>
          <dl className="mt-3 space-y-1.5">
            <Row label="Naziv" value={DEALER.legalName} />
            <Row label="Brand" value={DEALER.name} />
            <Row label="Adresa" value={`${DEALER.street}, ${DEALER.city}`} />
            <Row label="Prodajni agent" value={DEALER.agent} />
          </dl>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground">Kontakt</h2>
          <dl className="mt-3 space-y-1.5">
            <Row label="Telefon" value={DEALER.phone} />
            <Row label="E-mail" value={DEALER.email} />
            <Row label="Web" value={DEALER.web} />
          </dl>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground">Radno vrijeme</h2>
          <dl className="mt-3 space-y-1.5">
            <Row label="Ponedjeljak – Petak" value={DEALER.hoursWeek} />
            <Row label="Subota" value={DEALER.hoursSat} />
          </dl>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground">Napomena</h2>
          <p className="mt-3 text-muted">
            Sadržaj ovih stranica izrađen je s najvećom pažnjom. Za točnost,
            potpunost i ažurnost sadržaja ne preuzimamo odgovornost. Za sva
            pitanja slobodno nas kontaktirajte putem navedenih podataka.
          </p>
        </section>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
      <dt className="w-48 shrink-0 text-muted">{label}</dt>
      <dd className="font-medium text-foreground">{value}</dd>
    </div>
  );
}
