import { MessagesSquare, FileSignature, KeyRound } from "lucide-react";

/**
 * Three real, ordered steps — numbered because order genuinely matters here.
 * Reduces uncertainty/friction by making the path explicit and short.
 */
const STEPS = [
  {
    icon: MessagesSquare,
    title: "Informativni razgovor",
    body: "Javiš se i zajedno odaberemo vozilo te okvirno provjerimo uvjete financiranja — bez obveze.",
  },
  {
    icon: FileSignature,
    title: "Online zahtjev za financiranjem",
    body: "Ispuniš zahtjev iz fotelje. Odobrenje stiže već za 24 sata, bez odlaska u banku.",
  },
  {
    icon: KeyRound,
    title: "Prijepis i preuzimanje vozila",
    body: "Mi sredimo papirologiju i prijepis, a ti preuzimaš ključeve i krećeš na put.",
  },
];

export function PurchaseProcess() {
  return (
    <section className="bg-surface-2">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
        <div className="max-w-2xl">
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent-600">
            Postupak kupnje
          </span>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Od odabira do ključeva u tri koraka
          </h2>
          <p className="mt-2 text-muted">
            Jednostavno i transparentno — točno znaš što slijedi u svakom koraku.
          </p>
        </div>

        <ol className="mt-10 grid gap-5 md:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, body }, i) => (
            <li
              key={title}
              className="relative rounded-2xl border border-border bg-surface p-6 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </span>
                <span className="font-mono text-4xl font-bold text-foreground/10">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <h3 className="mt-4 text-lg font-bold text-foreground">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
