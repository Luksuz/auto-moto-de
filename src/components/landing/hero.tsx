import Link from "next/link";
import { ArrowRight, MessageCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroSearch } from "@/components/landing/hero-search";
import { DEALER, FINANCING, whatsappLink } from "@/lib/constants";

interface HeroProps {
  brands: string[];
  modelsByBrand: Record<string, string[]>;
}

/** Instrument-cluster style stat readouts (mono = data face). */
const PILLARS = [
  { value: "0%", label: "učešća" },
  { value: "100%", label: "online" },
  { value: `${FINANCING.approvalHours}h`, label: "odobrenje" },
  { value: "DE", label: "zaposleni" },
];

export function Hero({ brands, modelsByBrand }: HeroProps) {
  return (
    <section className="relative overflow-hidden bg-navy text-white">
      {/* ---------------------------------------------------------------- */}
      {/* Background layers — pure CSS automotive "road to Germany" scene.  */}
      {/* ---------------------------------------------------------------- */}
      <div className="pointer-events-none absolute inset-0">
        {/* Full-bleed muted autoplay loop — cars rolling in & lighting up.
            Gradient/grid layers below render on top for legibility. */}
        <video
          className="absolute inset-0 h-full w-full object-cover opacity-45"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster="/hero-poster.jpg"
          aria-hidden="true"
        >
          <source src="/hero.webm" type="video/webm" />
          <source src="/hero.mp4" type="video/mp4" />
        </video>

        {/* Base radial glows: headlights on the horizon. */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(900px 420px at 50% 8%, rgba(22,82,240,0.28), transparent 60%), radial-gradient(700px 380px at 50% 62%, rgba(255,122,0,0.16), transparent 65%)",
          }}
        />

        {/* Perspective "road" grid receding toward the horizon glow. */}
        <div className="absolute inset-x-0 bottom-0 h-[60%] overflow-hidden [perspective:680px]">
          <div
            className="absolute inset-0 origin-bottom"
            style={{
              transform: "rotateX(74deg) scale(1.6)",
              backgroundImage:
                "linear-gradient(to right, rgba(120,160,255,0.16) 1px, transparent 1px), linear-gradient(to bottom, rgba(120,160,255,0.16) 1px, transparent 1px)",
              backgroundSize: "46px 46px",
              maskImage:
                "linear-gradient(to top, rgba(0,0,0,0.9) 5%, transparent 72%)",
              WebkitMaskImage:
                "linear-gradient(to top, rgba(0,0,0,0.9) 5%, transparent 72%)",
            }}
          />
        </div>

        {/* Horizon light line. */}
        <div className="absolute left-1/2 top-[44%] h-px w-[70%] max-w-3xl -translate-x-1/2 bg-gradient-to-r from-transparent via-primary/60 to-transparent blur-[1px]" />

        {/* Top + bottom vignette to keep the headline area clean and uncluttered. */}
        <div className="absolute inset-0 bg-gradient-to-b from-navy/60 via-transparent to-navy" />
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Content                                                          */}
      {/* ---------------------------------------------------------------- */}
      <div className="relative mx-auto max-w-6xl px-4 pb-12 pt-16 sm:px-6 sm:pt-20 lg:pb-16 lg:pt-28">
        <div className="mx-auto max-w-3xl text-center">
          {/* Eyebrow — authority + origin (mono data tag). */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 backdrop-blur animate-fade-in-up">
            <ShieldCheck className="size-3.5 text-accent" />
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/75">
              Provjerena vozila iz Njemačke
            </span>
          </div>

          <h1 className="text-balance text-4xl font-extrabold leading-[1.05] tracking-tight animate-fade-in-up sm:text-5xl lg:text-6xl">
            Tvoj auto iz Njemačke
            <span className="mt-2 block bg-gradient-to-r from-accent via-amber-400 to-accent bg-clip-text text-transparent">
              uz financiranje 100% online
            </span>
          </h1>

          <p
            className="mx-auto mt-5 max-w-xl text-balance text-base text-white/70 animate-fade-in-up sm:text-lg"
            style={{ animationDelay: "60ms" }}
          >
            Odaberi vozilo, pošalji zahtjev i vozi. Bez učešća, bez papirologije
            i bez odlaska u banku — uz odobrenje već za {FINANCING.approvalHours}{" "}
            sata za sve zaposlene u Njemačkoj.
          </p>

          {/* CTAs */}
          <div
            className="mt-8 flex flex-col items-center justify-center gap-3 animate-fade-in-up sm:flex-row"
            style={{ animationDelay: "120ms" }}
          >
            <Button asChild variant="accent" size="lg" className="w-full sm:w-auto">
              <Link href="/vozila">
                Pronađi svoj auto
                <ArrowRight className="size-5" />
              </Link>
            </Button>
            <Button
              asChild
              variant="whatsapp"
              size="lg"
              className="w-full sm:w-auto"
            >
              <a
                href={whatsappLink(
                  "Pozdrav, zanima me financiranje vozila iz Njemačke.",
                )}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="size-5" />
                Pitaj na WhatsAppu
              </a>
            </Button>
          </div>

          {/* Instrument-cluster pillars. */}
          <div
            className="mx-auto mt-10 grid max-w-xl grid-cols-4 overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] backdrop-blur animate-fade-in-up"
            style={{ animationDelay: "180ms" }}
          >
            {PILLARS.map((p, i) => (
              <div
                key={p.label}
                className={`relative px-2 py-3.5 sm:px-3 ${
                  i > 0 ? "border-l border-white/10" : ""
                }`}
              >
                {/* gauge tick */}
                <span className="absolute inset-x-0 top-0 mx-auto h-0.5 w-8 rounded-full bg-accent/70" />
                <div className="font-mono text-xl font-bold text-white sm:text-2xl">
                  {p.value}
                </div>
                <div className="mt-0.5 text-[10px] uppercase tracking-wider text-white/55 sm:text-[11px]">
                  {p.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Inline search widget. */}
        <div
          className="mx-auto mt-10 max-w-4xl animate-fade-in-up"
          style={{ animationDelay: "240ms" }}
        >
          <HeroSearch brands={brands} modelsByBrand={modelsByBrand} />
          <p className="mt-3 text-center font-mono text-[11px] uppercase tracking-[0.15em] text-white/40">
            {DEALER.agent} · {DEALER.phone}
          </p>
        </div>
      </div>
    </section>
  );
}
