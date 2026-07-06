import type { Metadata } from "next";
import { Mail } from "lucide-react";
import { LeadForm } from "@/components/site/lead-form";
import { Button } from "@/components/ui/button";
import { DEALER, whatsappLink } from "@/lib/constants";
import { WhatsAppIcon, FacebookIcon } from "@/components/site/icons";

export const metadata: Metadata = {
  title: "Termin za preuzimanje",
  description:
    "Dogovorite termin za preuzimanje vozila — AUTOCAR EU.",
};

export default function TerminZaPreuzimanjePage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-12 sm:px-10 lg:px-14 lg:py-16">
      <h1 className="font-display text-[clamp(28px,6vw,40px)] font-semibold uppercase text-foreground">
        Termin za preuzimanje
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-muted">
        Nakon odobrenja financiranja i pripreme dokumentacije, dogovaramo termin
        za preuzimanje vozila. Javite nam se kako bismo odabrali termin koji vam
        najviše odgovara.
      </p>

      <section className="mt-10 border border-border bg-surface p-6 sm:p-8">
        <h2 className="font-display text-xl font-semibold uppercase tracking-[1px] text-foreground">
          Kontakt
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
          <li className="flex items-center gap-2.5">
            <FacebookIcon className="text-primary" />
            <a
              href={DEALER.facebook}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground hover:text-primary"
            >
              Facebook grupa — AUTOCAR EU
            </a>
          </li>
        </ul>
      </section>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <LeadForm
          type="VIEWING"
          triggerLabel="Zakaži termin"
          triggerVariant="primary"
          triggerSize="lg"
        />
        <Button asChild variant="whatsapp" size="lg">
          <a
            href={whatsappLink()}
            target="_blank"
            rel="noopener noreferrer"
          >
            <WhatsAppIcon className="size-4" />
            WhatsApp {DEALER.whatsappDePretty}
          </a>
        </Button>
      </div>
    </div>
  );
}
