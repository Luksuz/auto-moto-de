import type { Metadata } from "next";
import { getT } from "@/lib/i18n/server";
import { ProblemForm } from "@/components/site/forms/problem-form";

export const metadata: Metadata = {
  title: "Prijavi problem",
  description:
    "Imate problem s vozilom? Ispunite obrazac i naš tim će vam se javiti u najkraćem mogućem roku.",
  alternates: { canonical: "/prijavi-problem" },
};

export default async function PrijaviProblemPage() {
  const { t } = await getT();
  const usps = [t.probUsp1, t.probUsp2, t.probUsp3];

  return (
    <div>
      <div className="border-b border-border-soft bg-gradient-to-b from-[#121013] to-background px-5 pb-10 pt-14 text-center sm:px-10 lg:px-14">
        <div className="mb-3 font-display text-[12px] uppercase tracking-[4px] text-primary">
          {t.probKicker}
        </div>
        <h1 className="mb-3.5 font-display text-[clamp(28px,6vw,42px)] font-semibold uppercase">
          {t.probTitle}
        </h1>
        <p className="mx-auto max-w-[620px] text-[17px] leading-[1.6] text-muted">
          {t.probText}
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-10">
          {usps.map((usp) => (
            <div
              key={usp}
              className="flex items-center gap-2.5 text-[14px] font-semibold"
            >
              <span className="text-primary">◈</span> {usp}
            </div>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-[860px] px-5 pb-16 pt-11 sm:px-8">
        <ProblemForm />
      </div>
    </div>
  );
}
