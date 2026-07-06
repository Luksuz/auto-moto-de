import type { Metadata } from "next";
import { Mail } from "lucide-react";
import { DEALER, whatsappLink } from "@/lib/constants";
import { WhatsAppIcon } from "@/components/site/icons";

export const metadata: Metadata = {
  title: "Reklamacije",
  description:
    "Kako podnijeti reklamaciju i kontakt za prigovore — AUTOCAR EU.",
};

export default function ReklamacijePage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-12 sm:px-10 lg:px-14 lg:py-16">
      <h1 className="font-display text-[clamp(28px,6vw,40px)] font-semibold uppercase text-foreground">
        Reklamacije
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-muted">
        Vaše zadovoljstvo nam je na prvom mjestu. Ako imate prigovor ili
        reklamaciju u vezi s kupljenim vozilom ili pruženom uslugom, javite nam
        se — riješit ćemo ga u najkraćem mogućem roku.
      </p>

      <section className="mt-10 space-y-4 text-sm leading-relaxed text-foreground/90">
        <h2 className="font-display text-xl font-semibold uppercase tracking-[1px] text-foreground">
          Kako podnijeti reklamaciju
        </h2>
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            Kontaktirajte nas putem WhatsAppa ili e-mailom i opišite problem.
          </li>
          <li>
            Navedite podatke o vozilu (marka, model, broj šasije) i datum
            kupnje.
          </li>
          <li>
            Po potrebi priložite fotografije ili dokumentaciju koja potkrepljuje
            reklamaciju.
          </li>
          <li>
            Naš tim će pregledati reklamaciju i javiti vam se s prijedlogom
            rješenja.
          </li>
        </ol>
      </section>

      <section className="mt-10 border border-border bg-surface p-6">
        <h2 className="font-display text-base font-semibold uppercase tracking-[1px] text-foreground">
          Kontakt za reklamacije
        </h2>
        <ul className="mt-4 space-y-3 text-sm">
          <li className="flex items-center gap-2.5">
            <WhatsAppIcon className="text-primary" />
            <a
              href={whatsappLink(undefined, DEALER.whatsappDe)}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground hover:text-primary"
            >
              WhatsApp DE {DEALER.whatsappDePretty}
            </a>
          </li>
          <li className="flex items-center gap-2.5">
            <WhatsAppIcon className="text-primary" />
            <a
              href={whatsappLink(undefined, DEALER.whatsappHr)}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground hover:text-primary"
            >
              WhatsApp HR {DEALER.whatsappHrPretty}
            </a>
          </li>
          <li className="flex items-center gap-2.5">
            <Mail className="size-4 shrink-0 text-primary" />
            <a
              href={`mailto:${DEALER.email}`}
              className="font-medium text-foreground hover:text-primary"
            >
              {DEALER.email}
            </a>
          </li>
        </ul>
        <p className="mt-4 text-sm text-muted">{DEALER.name}</p>
      </section>
    </div>
  );
}
