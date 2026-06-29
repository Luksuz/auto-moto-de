import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, Globe2, Wallet, Handshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DEALER } from "@/lib/constants";

export const metadata: Metadata = {
  title: "O nama — KupiAuto.de",
  description:
    "KupiAuto.de (LON CARS) — provjerena rabljena vozila iz Njemačke uz transparentnu prodaju i financiranje 100% online.",
};

const VALUES = [
  {
    icon: Globe2,
    title: "Vozila s njemačkog tržišta",
    text: "Sva naša vozila dolaze s njemačkog tržišta — poznate servisne povijesti, uredne dokumentacije i provjerenog stanja.",
  },
  {
    icon: ShieldCheck,
    title: "Provjereno i transparentno",
    text: "Svako vozilo prolazi tehničku provjeru. Stanje, kilometraža i oprema jasno su navedeni, bez skrivenih iznenađenja.",
  },
  {
    icon: Wallet,
    title: "Financiranje 100% online",
    text: "Cijeli postupak financiranja odvija se online — bez učešća, uz odobrenje banke unutar jednog radnog dana.",
  },
  {
    icon: Handshake,
    title: "Osobni pristup",
    text: "Pratimo vas od prvog upita do preuzimanja ključeva. Na raspolaganju smo na hrvatskom jeziku za sva pitanja.",
  },
];

export default function ONamaPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <header className="max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">
          O nama
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          Vaš partner za rabljena vozila iz Njemačke
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-muted">
          {DEALER.name} pod tvrtkom {DEALER.legalName} bavi se prodajom
          provjerenih rabljenih vozila s njemačkog tržišta. Cilj nam je kupnju
          automobila učiniti jednostavnom, sigurnom i potpuno transparentnom.
        </p>
      </header>

      <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2">
        {VALUES.map((v) => {
          const Icon = v.icon;
          return (
            <div
              key={v.title}
              className="rounded-2xl border border-border bg-surface p-6 shadow-sm"
            >
              <div className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
                <Icon className="size-6" />
              </div>
              <h2 className="mt-4 text-lg font-bold text-foreground">
                {v.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">{v.text}</p>
            </div>
          );
        })}
      </div>

      <section className="mt-12 space-y-4 text-base leading-relaxed text-foreground/90">
        <h2 className="text-2xl font-bold text-foreground">Tko smo</h2>
        <p>
          Specijalizirani smo za uvoz i prodaju rabljenih vozila iz Njemačke za
          kupce koji žele pouzdan automobil uz povoljne uvjete financiranja.
          Svjesni smo da je kupnja automobila važna odluka, pa zato svako vozilo
          biramo i provjeravamo s pažnjom.
        </p>
        <p>
          Uz prodaju vozila nudimo i kompletnu podršku oko financiranja,
          osiguranja te prijepisa i registracije vozila — kako biste do svog
          automobila došli bez stresa i komplikacija.
        </p>
      </section>

      <div className="mt-12 flex flex-col gap-3 rounded-2xl bg-navy p-8 text-white sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold">Spremni za svoj novi automobil?</h2>
          <p className="mt-1 text-white/70">
            Pregledajte ponudu ili nas kontaktirajte za savjet.
          </p>
        </div>
        <div className="flex shrink-0 gap-3">
          <Button asChild variant="accent" size="lg">
            <Link href="/vozila">Pogledaj vozila</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="border-white/20 bg-transparent text-white hover:bg-white/10">
            <a href={`tel:${DEALER.phoneHref}`}>Nazovi nas</a>
          </Button>
        </div>
      </div>
    </div>
  );
}
