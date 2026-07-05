import Link from "next/link";
import Image from "next/image";
import { getT } from "@/lib/i18n/server";
import { oswald, hanken } from "@/lib/fonts";

// Root 404 for unmatched URLs — rendered outside the (site) layout,
// so it applies the theme scope itself.
export default async function RootNotFound() {
  const { t } = await getT();

  return (
    <div
      className={`${oswald.variable} ${hanken.variable} theme-autocar flex min-h-dvh flex-col items-center justify-center bg-background px-5 text-center font-body text-foreground`}
    >
      <Link href="/">
        <Image
          src="/brand/autocar-logo.png"
          alt="AUTOCAR EU"
          width={1522}
          height={424}
          className="h-12 w-auto"
        />
      </Link>
      <div className="mt-10 font-display text-[13px] font-semibold uppercase tracking-[4px] text-primary">
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
