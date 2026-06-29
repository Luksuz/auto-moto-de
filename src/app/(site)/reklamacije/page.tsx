import type { Metadata } from "next";
import { Phone, Mail } from "lucide-react";
import { DEALER } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Reklamacije — KupiAuto.de",
  description:
    "Kako podnijeti reklamaciju i kontakt za prigovore — KupiAuto.de (LON CARS).",
};

export default function ReklamacijePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
        Reklamacije
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-muted">
        Vaše zadovoljstvo nam je na prvom mjestu. Ako imate prigovor ili
        reklamaciju u vezi s kupljenim vozilom ili pruženom uslugom, javite nam
        se — riješit ćemo ga u najkraćem mogućem roku.
      </p>

      <section className="mt-10 space-y-4 text-sm leading-relaxed text-foreground/90">
        <h2 className="text-xl font-bold text-foreground">Kako podnijeti reklamaciju</h2>
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            Kontaktirajte nas telefonom ili e-mailom i opišite problem.
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

      <section className="mt-10 rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <h2 className="text-base font-bold text-foreground">
          Kontakt za reklamacije
        </h2>
        <ul className="mt-4 space-y-3 text-sm">
          <li className="flex items-center gap-2.5">
            <Phone className="size-4 shrink-0 text-primary" />
            <a
              href={`tel:${DEALER.phoneHref}`}
              className="font-medium text-foreground hover:text-primary"
            >
              {DEALER.phone}
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
        <p className="mt-4 text-sm text-muted">
          {DEALER.legalName}, {DEALER.street}, {DEALER.city}
        </p>
      </section>
    </div>
  );
}
