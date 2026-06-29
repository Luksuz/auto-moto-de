import Link from "next/link";
import { ArrowRight, Zap, Wallet, Users, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FINANCING } from "@/lib/constants";
import { formatPrice } from "@/lib/utils";

/** Representative vehicle price used for the headline monthly example. */
const EXAMPLE_PRICE = 20000;

/** Annuity formula: monthly = P * r / (1 - (1+r)^-n). */
function monthlyPayment(principal: number, annualRate: number, months: number) {
  const r = annualRate / 12 / 100;
  return (principal * r) / (1 - Math.pow(1 + r, -months));
}

const BENEFITS = [
  {
    icon: Wallet,
    title: "0% učešća",
    body: "Financiraj cijeli iznos vozila — bez vlastitog kapitala na startu.",
  },
  {
    icon: Clock,
    title: `Odobrenje za ${FINANCING.approvalHours}h`,
    body: "Brz odgovor na zahtjev. Bez čekanja u redovima i banci.",
  },
  {
    icon: Users,
    title: "Za sve zaposlene u Njemačkoj",
    body: "Ako imaš stalan posao u Njemačkoj, kvalificiran si za financiranje.",
  },
];

export function FinancingBand() {
  const monthly = monthlyPayment(
    EXAMPLE_PRICE,
    FINANCING.exampleRate,
    FINANCING.exampleMonths,
  );
  const fromMonthly = formatPrice(Math.round(monthly));

  return (
    <section className="relative overflow-hidden bg-navy text-white">
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(620px 360px at 85% 18%, rgba(255,122,0,0.18), transparent 65%), radial-gradient(540px 340px at 10% 90%, rgba(22,82,240,0.22), transparent 65%)",
        }}
      />

      <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-20">
        {/* Left: the offer */}
        <div>
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent">
            Financiranje
          </span>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Vozi odmah, plaćaj u ratama koje ti odgovaraju
          </h2>
          <p className="mt-3 max-w-lg text-white/70">
            Cijeli proces odrađuješ od kuće. Bez učešća, uz fiksnu kamatu i jasan
            mjesečni iznos koji znaš unaprijed.
          </p>

          <ul className="mt-8 space-y-4">
            {BENEFITS.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex gap-3.5">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
                  <Icon className="size-5" />
                </span>
                <div>
                  <p className="font-semibold">{title}</p>
                  <p className="text-sm text-white/65">{body}</p>
                </div>
              </li>
            ))}
          </ul>

          <Button asChild variant="accent" size="lg" className="mt-9">
            <Link href="/uvjeti-financiranja">
              Pogledaj uvjete financiranja
              <ArrowRight className="size-5" />
            </Link>
          </Button>
        </div>

        {/* Right: the "instrument" readout — anchored monthly figure. */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur sm:p-8">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/50">
              Primjer rate
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-2.5 py-1 text-[11px] font-semibold text-accent">
              <Zap className="size-3.5" />
              već od
            </span>
          </div>

          <div className="mt-4 flex items-end gap-2">
            <span className="font-mono text-5xl font-bold leading-none tracking-tight text-white sm:text-6xl">
              {fromMonthly}
            </span>
            <span className="pb-1 text-lg font-semibold text-white/60">/ mj</span>
          </div>

          <div className="mt-6 space-y-2.5 border-t border-white/10 pt-5 font-mono text-sm">
            <Row label="Cijena vozila" value={formatPrice(EXAMPLE_PRICE)} />
            <Row label="Učešće" value={`${FINANCING.downPayment} €`} />
            <Row
              label="Kamatna stopa"
              value={`${FINANCING.exampleRate.toLocaleString("hr-HR")} %`}
            />
            <Row label="Rok otplate" value={`${FINANCING.exampleMonths} mj`} />
          </div>

          <p className="mt-5 text-[11px] leading-relaxed text-white/45">
            Reprezentativni primjer. Stopa od {FINANCING.minRate.toLocaleString("hr-HR")}%
            do {FINANCING.maxRate.toLocaleString("hr-HR")}% ovisno o procjeni. Konačna
            ponuda izračunava se za odabrano vozilo.
          </p>
        </div>
      </div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-white/55">{label}</span>
      <span className="font-semibold text-white">{value}</span>
    </div>
  );
}
