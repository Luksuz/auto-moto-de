import Link from "next/link";
import { ArrowRight, MessageCircle, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DEALER, FINANCING, whatsappLink } from "@/lib/constants";

/**
 * Closing CTA. Loss-aversion framing ("ne čekaj") + a single dominant action,
 * with low-friction alternatives (WhatsApp / poziv) for the hesitant.
 */
export function FinalCta() {
  return (
    <section className="relative overflow-hidden bg-navy text-white">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(700px 380px at 50% 0%, rgba(255,122,0,0.20), transparent 60%), radial-gradient(600px 360px at 50% 100%, rgba(22,82,240,0.22), transparent 65%)",
        }}
      />
      {/* faint instrument grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.5]"
        style={{
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)",
          backgroundSize: "26px 26px",
          maskImage:
            "radial-gradient(circle at 50% 50%, black, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(circle at 50% 50%, black, transparent 75%)",
        }}
      />

      <div className="relative mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 lg:py-24">
        <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">
          Spreman za novi auto?
        </span>
        <h2 className="mt-3 text-balance text-3xl font-extrabold tracking-tight sm:text-5xl">
          Tvoj sljedeći auto čeka u Njemačkoj
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-balance text-white/70">
          Odaberi vozilo danas i pošalji zahtjev — odobrenje stiže već za{" "}
          {FINANCING.approvalHours} sata. Bez učešća, 100% online.
        </p>

        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild variant="accent" size="lg" className="w-full sm:w-auto">
            <Link href="/vozila">
              Pregledaj vozila
              <ArrowRight className="size-5" />
            </Link>
          </Button>
          <Button asChild variant="whatsapp" size="lg" className="w-full sm:w-auto">
            <a
              href={whatsappLink(
                "Pozdrav, želio bih financirati vozilo iz Njemačke.",
              )}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle className="size-5" />
              WhatsApp upit
            </a>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="w-full border-white/20 bg-white/5 text-white hover:bg-white/10 sm:w-auto"
          >
            <a href={`tel:${DEALER.phoneHref}`}>
              <Phone className="size-5" />
              Nazovi
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}
