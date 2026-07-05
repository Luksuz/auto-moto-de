import Link from "next/link";
import { Euro, Shield, TriangleAlert } from "lucide-react";
import type { Dict } from "@/lib/i18n/dictionary";

/** Three service teaser cards: financing, problem report, insurance. */
export function ServiceTeasers({ t }: { t: Dict }) {
  const teasers = [
    { href: "/financiranje", Icon: Euro, title: t.navFinancing, text: t.teaserFin },
    { href: "/prijavi-problem", Icon: TriangleAlert, title: t.navProblem, text: t.teaserProb },
    { href: "/osiguranje", Icon: Shield, title: t.navInsurance, text: t.teaserIns },
  ];

  return (
    <section className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-[22px] px-5 pb-16 sm:px-10 lg:px-14">
      {teasers.map(({ href, Icon, title, text }) => (
        <Link
          key={href}
          href={href}
          className="border border-border p-7 hover:border-primary"
        >
          <Icon className="size-8 text-primary" />
          <div className="mb-2 mt-2.5 font-display text-[18px] font-semibold uppercase text-foreground">
            {title}
          </div>
          <div className="text-[14.5px] leading-[1.55] text-muted-2">{text}</div>
          <div className="mt-4 text-[13px] font-bold uppercase tracking-[1.5px] text-primary">
            {t.more} →
          </div>
        </Link>
      ))}
    </section>
  );
}
