import Link from "next/link";
import { Phone, Mail, MapPin, Clock, Car } from "lucide-react";
import { DEALER, NAV_LINKS } from "@/lib/constants";

const FOOTER_INFO = [
  { href: "/postupak-kupnje", label: "Postupak kupovine" },
  { href: "/uvjeti-financiranja", label: "Uvjeti financiranja" },
  { href: "/termin-za-preuzimanje", label: "Termin za preuzimanje" },
  { href: "/tijek-preuzimanja", label: "Tijek preuzimanja" },
  { href: "/reklamacije", label: "Reklamacije" },
  { href: "/impressum", label: "Impressum" },
];

export function SiteFooter() {
  return (
    <footer className="mt-auto bg-navy text-white/80">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link href="/" className="flex items-center gap-2 text-lg font-extrabold text-white">
              <span className="grid size-9 place-items-center rounded-lg bg-primary text-white">
                <Car className="size-5" />
              </span>
              Kupi<span className="text-primary">Auto</span>.de
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-white/60">
              Provjerena rabljena vozila iz Njemačke uz financiranje 100% online,
              0% učešća i odobrenje unutar 24 sata.
            </p>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wide text-white">
              Navigacija
            </h4>
            <ul className="space-y-2.5 text-sm">
              {NAV_LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="hover:text-white">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wide text-white">
              Informacije
            </h4>
            <ul className="space-y-2.5 text-sm">
              {FOOTER_INFO.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="hover:text-white">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wide text-white">
              Kontakt
            </h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  {DEALER.legalName}
                  <br />
                  {DEALER.street}, {DEALER.city}
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="size-4 shrink-0 text-primary" />
                <a href={`tel:${DEALER.phoneHref}`} className="hover:text-white">
                  {DEALER.phone}
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="size-4 shrink-0 text-primary" />
                <a href={`mailto:${DEALER.email}`} className="hover:text-white">
                  {DEALER.email}
                </a>
              </li>
              <li className="flex items-start gap-2.5">
                <Clock className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  Pon–Pet: {DEALER.hoursWeek}
                  <br />
                  Sub: {DEALER.hoursSat}
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs text-white/50 sm:flex-row">
          <p>© {new Date().getFullYear()} KupiAuto.de — Sva prava pridržana.</p>
          <p>Prodajni agent: {DEALER.agent}</p>
        </div>
      </div>
    </footer>
  );
}
