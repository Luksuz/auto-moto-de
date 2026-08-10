import Link from "next/link";
import { getDict, getHeaderLocale } from "@/lib/i18n/server";
import { localePath } from "@/lib/i18n/config";

// not-found boundaries receive no route params, so the locale comes from the
// header the proxy sets.
export default async function SiteNotFound() {
  const locale = await getHeaderLocale();
  const t = getDict(locale);

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
        href={localePath(locale, "/vozila")}
        className="mt-8 bg-primary px-[30px] py-4 font-display text-[15px] font-semibold uppercase tracking-[2px] text-primary-foreground hover:bg-primary-600"
      >
        {t.heroCta}
      </Link>
    </div>
  );
}
