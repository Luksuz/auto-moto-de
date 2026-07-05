import Link from "next/link";
import Image from "next/image";
import { Phone } from "lucide-react";
import { DEALER, whatsappLink } from "@/lib/constants";
import type { Dict } from "@/lib/i18n/dictionary";

/** Homepage hero: split text/photo layout per the AUTOCAR EU prototype. */
export function Hero({ t }: { t: Dict }) {
  const avatars = [
    { initials: "MK", bg: "#2A2620" },
    { initials: "IH", bg: "#332D22" },
    { initials: "AŠ", bg: "#3B3324" },
  ];

  return (
    <section className="grid items-center lg:grid-cols-2">
      <div className="p-5 py-10 sm:p-10 lg:p-14 lg:py-[70px]">
        <div className="mb-5 font-display text-[13px] uppercase tracking-[4px] text-primary">
          {t.heroKicker}
        </div>
        <h1 className="mb-5 font-display text-[clamp(30px,6vw,48px)] font-semibold uppercase leading-[1.08]">
          {t.heroTitle1}
          <br />
          <span className="text-primary">{t.heroTitle2}</span>
        </h1>
        <p className="mb-[34px] max-w-[470px] text-[17px] leading-[1.6] text-muted">
          {t.heroText}
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <Link
            href="/vozila"
            className="bg-primary px-[30px] py-4 font-display text-[15px] font-semibold uppercase tracking-[2px] text-primary-foreground hover:bg-primary-600"
          >
            {t.heroCta}
          </Link>
          <a
            href={whatsappLink(undefined, DEALER.whatsappHr)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 text-[15px] font-semibold text-foreground hover:text-primary"
          >
            <span className="grid size-[38px] place-items-center rounded-full border border-border-strong text-whatsapp">
              <Phone className="size-4" />
            </span>
            {DEALER.whatsappHrPretty}
          </a>
        </div>
        <div className="mt-10 flex items-center gap-3.5">
          <div className="flex">
            {avatars.map((a, i) => (
              <span
                key={a.initials}
                className={`grid size-[34px] place-items-center rounded-full border-2 border-background text-[12px] font-bold text-primary ${i > 0 ? "-ml-2.5" : ""}`}
                style={{ background: a.bg }}
              >
                {a.initials}
              </span>
            ))}
          </div>
          <div className="text-[13.5px] text-muted">
            <span className="text-primary">★★★★★</span> {t.heroSocial}{" "}
            <a
              href={DEALER.facebook}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-primary"
            >
              {t.heroSocialLink}
            </a>
          </div>
        </div>
      </div>

      <div className="relative h-[300px] lg:h-[540px]">
        <Image
          src="/brand/hero.jpg"
          alt={`${DEALER.name} — ${t.heroKicker}`}
          fill
          sizes="(max-width: 1024px) 100vw, 50vw"
          fetchPriority="high"
          className="object-cover"
        />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg,#0C0C0E 0%,rgba(12,12,14,0) 45%)",
          }}
        />
        <div className="absolute bottom-6 right-6 border border-primary bg-background/85 px-5 py-4 backdrop-blur">
          <div className="font-display text-[12px] uppercase tracking-[3px] text-primary">
            {t.heroBadge1}
          </div>
          <div className="font-display text-[20px] font-semibold uppercase">
            {t.heroBadge2}
          </div>
        </div>
      </div>
    </section>
  );
}
