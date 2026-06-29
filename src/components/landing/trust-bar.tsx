import { ShieldCheck, BadgeCheck, FileCheck2, Wrench } from "lucide-react";

const BRANDS = [
  "Volkswagen",
  "BMW",
  "Audi",
  "Mercedes-Benz",
  "Škoda",
  "SEAT",
  "Opel",
  "Ford",
];

const SIGNALS = [
  { icon: ShieldCheck, label: "Provjerena vozila" },
  { icon: BadgeCheck, label: "EU porijeklo" },
  { icon: FileCheck2, label: "TÜV dokumentacija" },
  { icon: Wrench, label: "Garancija" },
];

/**
 * Authority + social proof: recognizable German marques (mere-exposure,
 * authority bias) and concrete trust signals that reduce purchase risk.
 */
export function TrustBar() {
  return (
    <section className="border-y border-border bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <p className="text-center font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
          Njemačka kvaliteta · marke koje prepoznaješ
        </p>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 sm:gap-x-9">
          {BRANDS.map((b) => (
            <span
              key={b}
              className="text-base font-bold tracking-tight text-foreground/35 transition-colors hover:text-foreground/70 sm:text-lg"
            >
              {b}
            </span>
          ))}
        </div>

        <div className="mt-7 grid grid-cols-2 gap-3 border-t border-border pt-6 sm:grid-cols-4">
          {SIGNALS.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex items-center justify-center gap-2 text-sm font-semibold text-foreground"
            >
              <Icon className="size-4 text-success" />
              {label}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
