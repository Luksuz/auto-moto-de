import type { Metadata } from "next";
import { DEALER } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Impressum",
  description: "Pravne informacije i podaci o tvrtki AUTOCAR EU.",
};

export default function ImpressumPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-12 sm:px-10 lg:px-14 lg:py-16">
      <h1 className="font-display text-[clamp(28px,6vw,40px)] font-semibold uppercase text-foreground">
        Impressum
      </h1>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-foreground/90">
        <section>
          <h2 className="font-display text-base font-semibold uppercase tracking-[1px] text-foreground">
            Podaci o pružatelju usluge
          </h2>
          <dl className="mt-3 space-y-1.5">
            <Row label="Naziv" value={DEALER.name} />
            <Row label="Pravni naziv tvrtke" value="[Pravni naziv tvrtke]" />
            <Row label="Sjedište (adresa)" value="[Adresa tvrtke]" />
            <Row label="Sudski registar" value="[Broj upisa u registar]" />
            <Row label="OIB / PDV ID (USt-IdNr.)" value="[PDV identifikacijski broj]" />
          </dl>
        </section>

        <section>
          <h2 className="font-display text-base font-semibold uppercase tracking-[1px] text-foreground">
            Kontakt
          </h2>
          <dl className="mt-3 space-y-1.5">
            <Row label="E-mail" value={DEALER.email} />
            <Row label="WhatsApp DE" value={DEALER.whatsappDePretty} />
            <Row label="WhatsApp HR" value={DEALER.whatsappHrPretty} />
            <Row label="Facebook" value="Facebook grupa — AUTOCAR EU" href={DEALER.facebook} />
          </dl>
        </section>

        <section>
          <h2 className="font-display text-base font-semibold uppercase tracking-[1px] text-foreground">
            Napomena
          </h2>
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

function Row({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
      <dt className="w-48 shrink-0 text-muted">{label}</dt>
      <dd className="font-medium text-foreground">
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary"
          >
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}
