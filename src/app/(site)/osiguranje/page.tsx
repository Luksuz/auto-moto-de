import type { Metadata } from "next";
import Image from "next/image";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { INSURANCE_ADVISOR, whatsappLink } from "@/lib/constants";
import { getT } from "@/lib/i18n/server";
import { InsuranceForm } from "@/components/site/forms/insurance-form";
import { WhatsAppIcon } from "@/components/site/icons";

export const metadata: Metadata = {
  title: "Osiguranje",
  description:
    "Auto osiguranje, kasko i sva ostala osiguranja za Njemačku i Austriju — uz osobnog savjetnika koji govori vaš jezik.",
  alternates: { canonical: "/osiguranje" },
};

export default async function OsiguranjePage() {
  const { t } = await getT();

  return (
    <div>
      <div className="grid items-center gap-11 border-b border-border-soft bg-gradient-to-b from-[#121013] to-background px-5 pb-11 pt-14 sm:px-10 lg:grid-cols-[1.1fr_0.9fr] lg:px-14">
        <div>
          <div className="mb-3 font-display text-[12px] uppercase tracking-[4px] text-primary">
            {t.insKicker}
          </div>
          <h1 className="mb-3.5 font-display text-[clamp(28px,6vw,42px)] font-semibold uppercase">
            {t.insTitle}
          </h1>
          <p className="mb-[26px] max-w-[520px] text-[17px] leading-[1.6] text-muted">
            {t.insText}
          </p>
          <div className="flex max-w-[440px] flex-col gap-2.5">
            <Button
              asChild
              variant="whatsapp"
              size="lg"
              className="w-full justify-between text-[15.5px] font-bold"
            >
              <a href={whatsappLink(undefined, INSURANCE_ADVISOR.whatsappDe)}>
                <span className="inline-flex items-center gap-2.5">
                  <WhatsAppIcon className="size-4" /> WhatsApp {t.germany}
                </span>
                <span>{INSURANCE_ADVISOR.whatsappDePretty}</span>
              </a>
            </Button>
            <Button
              asChild
              variant="whatsappDark"
              size="lg"
              className="w-full justify-between text-[15.5px] font-bold"
            >
              <a href={whatsappLink(undefined, INSURANCE_ADVISOR.whatsappAt)}>
                <span className="inline-flex items-center gap-2.5">
                  <WhatsAppIcon className="size-4" /> WhatsApp {t.austria}
                </span>
                <span>{INSURANCE_ADVISOR.whatsappAtPretty}</span>
              </a>
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-[22px] border border-border bg-surface p-[26px]">
          <Image
            src="/brand/goran-kanjir.png"
            alt={INSURANCE_ADVISOR.name}
            width={150}
            height={190}
            className="h-[190px] w-[150px] border border-primary object-cover object-top"
          />
          <div className="min-w-0">
            <div className="mb-1.5 font-display text-[11px] uppercase tracking-[3px] text-primary">
              {t.insAdvisor}
            </div>
            <div className="font-display text-[23px] font-semibold uppercase">
              {INSURANCE_ADVISOR.name}
            </div>
            <div className="my-1.5 mb-3 text-[14px] leading-[1.5] text-muted">
              {INSURANCE_ADVISOR.company}
              <br />
              {t.insRegion}
            </div>
            <div className="text-[13.5px] leading-[1.7] text-muted-2">
              <div className="flex items-center gap-2">
                <WhatsAppIcon className="size-3.5" />
                {INSURANCE_ADVISOR.whatsappDePretty} ({t.germany})
              </div>
              <div className="flex items-center gap-2">
                <WhatsAppIcon className="size-3.5" />
                {INSURANCE_ADVISOR.whatsappAtPretty} ({t.austria})
              </div>
              <div className="flex items-center gap-2">
                <Mail className="size-3.5 shrink-0" />
                {INSURANCE_ADVISOR.email}
              </div>
            </div>
            <div className="mt-3 text-[14px] italic text-primary">
              {`„${t.insQuote}"`}
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 pb-2 pt-11 sm:px-10 lg:px-14">
        <h2 className="mb-6 text-center font-display text-[28px] font-semibold uppercase">
          {t.insServicesTitle}
        </h2>
        <div className="mx-auto grid max-w-[1000px] gap-x-[22px] gap-y-2.5 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
          {t.insServices.map((service) => (
            <div
              key={service}
              className="flex items-center gap-2.5 border-b border-border-soft py-[9px] text-[14.5px] text-muted"
            >
              <span className="text-primary">◆</span> {service}
            </div>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-[860px] px-5 pb-16 pt-10 sm:px-8">
        <InsuranceForm />
      </div>
    </div>
  );
}
