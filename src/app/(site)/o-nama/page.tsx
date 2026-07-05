import type { Metadata } from "next";
import { DEALER, whatsappLink } from "@/lib/constants";
import { getT } from "@/lib/i18n/server";

export const metadata: Metadata = {
  title: "O nama — AUTOCAR EU",
  description:
    "AUTOCAR EU — od 2018. prodajemo provjerena vozila iz Njemačke i Austrije. Preko 350 vozila na stanju, garancija do 3 godine i tisuće zadovoljnih kupaca.",
};

export default async function ONamaPage() {
  const { t } = await getT();

  const stats: { value: string; label: string; className: string }[] = [
    {
      value: "8",
      label: t.aboutS1,
      className: "border-r border-b border-border-soft lg:border-b-0",
    },
    {
      value: "350+",
      label: t.aboutS2,
      className: "border-b border-border-soft lg:border-b-0 lg:border-r",
    },
    {
      value: `3 ${t.years}`,
      label: t.aboutS3,
      className: "border-r border-border-soft",
    },
    { value: "1000+", label: t.aboutS4, className: "" },
  ];

  const values: { num: string; title: string; text: string }[] = [
    { num: "01", title: t.aboutV1, text: t.aboutV1t },
    { num: "02", title: t.aboutV2, text: t.aboutV2t },
    { num: "03", title: t.aboutV3, text: t.aboutV3t },
  ];

  return (
    <div>
      {/* Hero */}
      <div className="border-b border-border-soft bg-gradient-to-b from-[#121013] to-background px-5 pt-15 pb-12 text-center sm:px-10 lg:px-14">
        <div className="mb-3 font-display text-[12px] uppercase tracking-[4px] text-primary">
          AUTOCAR EU · {t.aboutSince}
        </div>
        <h1 className="mb-4 font-display text-[clamp(28px,6.5vw,44px)] font-semibold uppercase">
          {t.aboutTitle}
        </h1>
        <p className="mx-auto max-w-[720px] text-[17.5px] leading-[1.65] text-muted">
          {t.aboutText}
        </p>
      </div>

      {/* Stats band */}
      <div className="grid grid-cols-2 border-b border-border-soft lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className={`px-5 py-8 text-center ${s.className}`}>
            <div className="font-display text-[38px] font-semibold text-primary">
              {s.value}
            </div>
            <div className="mt-1 text-[13px] uppercase tracking-[1.5px] text-muted-2">
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Value cards */}
      <div className="mx-auto grid max-w-[1240px] grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-[22px] px-5 py-14 sm:px-10 lg:px-14">
        {values.map((v) => (
          <div key={v.num} className="border border-border p-7">
            <div className="font-display text-[30px] font-semibold text-primary">
              {v.num}
            </div>
            <div className="my-2.5 font-display text-[17px] font-semibold uppercase">
              {v.title}
            </div>
            <div className="text-[14.5px] leading-relaxed text-muted-2">
              {v.text}
            </div>
          </div>
        ))}
      </div>

      {/* CTA band */}
      <div className="px-5 sm:px-10 lg:px-14">
        <div className="mx-auto mb-16 flex max-w-[1128px] flex-wrap items-center justify-between gap-6 border border-primary p-9 px-10">
          <div>
            <div className="mb-1.5 font-display text-[24px] font-semibold uppercase">
              {t.aboutCta}
            </div>
            <div className="text-[15px] text-muted-2">
              {t.aboutCtaT}{" "}
              <a
                href={DEALER.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                Facebook — AUTOCAR EU
              </a>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              href={whatsappLink(undefined, DEALER.whatsappDe)}
              className="flex flex-col border border-border-strong px-[18px] py-2.5 hover:border-primary"
            >
              <span className="text-[11px] uppercase tracking-[1.5px] text-muted-2">
                WhatsApp DE
              </span>
              <span className="font-display text-[17px] text-success">
                {DEALER.whatsappDePretty}
              </span>
            </a>
            <a
              href={whatsappLink(undefined, DEALER.whatsappHr)}
              className="flex flex-col border border-border-strong px-[18px] py-2.5 hover:border-primary"
            >
              <span className="text-[11px] uppercase tracking-[1.5px] text-muted-2">
                WhatsApp HR
              </span>
              <span className="font-display text-[17px] text-success">
                {DEALER.whatsappHrPretty}
              </span>
            </a>
            <a
              href={`mailto:${DEALER.email}`}
              className="flex flex-col border border-border-strong px-[18px] py-2.5 hover:border-primary"
            >
              <span className="text-[11px] uppercase tracking-[1.5px] text-muted-2">
                E-mail
              </span>
              <span className="font-display text-[17px] text-primary">
                {DEALER.email}
              </span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
