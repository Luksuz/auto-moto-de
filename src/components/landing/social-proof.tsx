import { Star, Phone, MessageCircle, Clock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DEALER, whatsappLink } from "@/lib/constants";

/**
 * Social proof + authority. Testimonials are illustrative and generic (not
 * attributed to real people). Stats give a bandwagon signal; the agent card
 * puts a credible, reachable human behind the brand (authority + liking).
 */
const TESTIMONIALS = [
  {
    quote:
      "Cijeli proces sam odradio iz Hrvatske preko WhatsAppa. Auto je stigao točno kako je opisan, a financiranje je odobreno isti dan.",
    name: "Marko T.",
    meta: "VW Passat · financiranje",
  },
  {
    quote:
      "Nisam vjerovao da je moguće bez učešća. Ivan je sve objasnio jasno, bez skrivenih troškova. Rata je točno kako smo dogovorili.",
    name: "Ana K.",
    meta: "Audi A4 · 84 rate",
  },
  {
    quote:
      "Tražio sam pouzdan diesel za posao. Dobio sam provjereno vozilo s TÜV-om i papirologijom sređenom do kraja. Preporuka.",
    name: "Ivan P.",
    meta: "Škoda Octavia · preuzeto",
  },
];

const STATS = [
  { value: "500+", label: "zadovoljnih kupaca" },
  { value: "100+", label: "vozila u ponudi" },
  { value: "24h", label: "prosječno odobrenje" },
  { value: "4,9/5", label: "ocjena kupaca" },
];

export function SocialProof() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
      <div className="max-w-2xl">
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent-600">
          Iskustva kupaca
        </span>
        <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          Ljudi nam vjeruju svoj sljedeći auto
        </h2>
      </div>

      {/* Stat strip */}
      <div className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-4">
        {STATS.map((s) => (
          <div key={s.label} className="bg-surface px-4 py-6 text-center">
            <div className="font-mono text-3xl font-bold text-navy sm:text-4xl">
              {s.value}
            </div>
            <div className="mt-1 text-xs uppercase tracking-wide text-muted">
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Testimonials */}
      <div className="mt-6 grid gap-5 md:grid-cols-3">
        {TESTIMONIALS.map((t) => (
          <figure
            key={t.name}
            className="flex flex-col rounded-2xl border border-border bg-surface p-6 shadow-sm"
          >
            <div className="flex gap-0.5 text-accent">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="size-4 fill-current" />
              ))}
            </div>
            <blockquote className="mt-3 flex-1 text-sm leading-relaxed text-foreground/90">
              “{t.quote}”
            </blockquote>
            <figcaption className="mt-4 border-t border-border pt-3">
              <span className="font-semibold text-foreground">{t.name}</span>
              <span className="ml-2 text-xs text-muted">{t.meta}</span>
            </figcaption>
          </figure>
        ))}
      </div>

      {/* Authority: the agent behind it all */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-navy text-white">
        <div className="grid gap-6 p-6 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:p-8">
          {/* TODO: agent photo here — replace this avatar with next/image of Ivan Vidović */}
          <div className="flex size-20 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
            <User className="size-9 text-white/70" />
          </div>

          <div>
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
              Tvoj kontakt
            </span>
            <p className="mt-1 text-xl font-bold">{DEALER.agent}</p>
            <p className="text-sm text-white/65">
              Savjetnik za prodaju i financiranje · {DEALER.name}
            </p>
            <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-white/65">
              <Clock className="size-4 text-accent" />
              Pon–Pet {DEALER.hoursWeek} · Sub {DEALER.hoursSat}
            </p>
          </div>

          <div className="flex flex-col gap-2.5 sm:items-end">
            <Button asChild variant="accent" className="w-full sm:w-auto">
              <a href={`tel:${DEALER.phoneHref}`}>
                <Phone className="size-4" />
                {DEALER.phone}
              </a>
            </Button>
            <Button asChild variant="whatsapp" className="w-full sm:w-auto">
              <a
                href={whatsappLink(
                  `Pozdrav ${DEALER.agent}, imam pitanje o vozilu i financiranju.`,
                )}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="size-4" />
                Piši na WhatsApp
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
