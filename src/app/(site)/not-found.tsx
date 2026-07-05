import Link from "next/link";
import { getT } from "@/lib/i18n/server";

export default async function SiteNotFound() {
  const { t } = await getT();

  return (
    <div className="flex flex-col items-center px-5 py-24 text-center">
      <div className="font-display text-[13px] font-semibold uppercase tracking-[4px] text-primary">
        404
      </div>
      <h1 className="mt-3 font-display text-[clamp(28px,6vw,40px)] font-semibold uppercase">
        {t.notFoundTitle}
      </h1>
      <p className="mt-4 max-w-[480px] text-[16px] leading-relaxed text-muted">
        {t.notFoundText}
      </p>
      <Link
        href="/vozila"
        className="mt-8 bg-primary px-[30px] py-4 font-display text-[15px] font-semibold uppercase tracking-[2px] text-primary-foreground hover:bg-primary-600"
      >
        {t.heroCta}
      </Link>
    </div>
  );
}
