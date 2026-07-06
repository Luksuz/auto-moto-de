import Link from "next/link";
import Image from "next/image";
import { DEALER, INFO_NAV, whatsappLink } from "@/lib/constants";
import { getT } from "@/lib/i18n/server";
import { WhatsAppIcon, FacebookIcon } from "@/components/site/icons";

export async function SiteFooter() {
  const { t } = await getT();

  return (
    <footer className="mt-auto border-t border-border-soft px-5 py-8 text-[13.5px] text-muted-2 sm:px-10 lg:px-14">
      <div className="flex flex-wrap items-center justify-between gap-5">
        <Image
          src="/brand/autocar-logo.png"
          alt="AUTOCAR EU"
          width={1522}
          height={424}
          className="h-[40px] w-auto"
        />

        <div className="flex flex-wrap gap-6">
          <a
            href={`mailto:${DEALER.email}`}
            className="transition-colors hover:text-primary"
          >
            {DEALER.email}
          </a>
          <a
            href={DEALER.facebook}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 transition-colors hover:text-primary"
          >
            <FacebookIcon className="size-3.5" />
            {t.fbGroup}
          </a>
          <a
            href={whatsappLink(undefined, DEALER.whatsappDe)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 transition-colors hover:text-primary"
          >
            <WhatsAppIcon className="size-3.5" />
            WhatsApp DE {DEALER.whatsappDePretty}
          </a>
          <a
            href={whatsappLink(undefined, DEALER.whatsappHr)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 transition-colors hover:text-primary"
          >
            <WhatsAppIcon className="size-3.5" />
            WhatsApp HR {DEALER.whatsappHrPretty}
          </a>
        </div>

        <div className="flex items-center gap-[18px]">
          <Link
            href="/admin"
            className="text-[12.5px] font-semibold uppercase tracking-[1.5px] transition-colors hover:text-primary"
          >
            {t.admLink}
          </Link>
          <span>© 2026 AUTOCAR EU</span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-border-soft/50 pt-4">
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {INFO_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="transition-colors hover:text-primary"
            >
              {t[item.key]}
            </Link>
          ))}
        </div>
        <a
          href="https://mindx.global"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[12.5px] transition-colors hover:text-primary"
        >
          made by MindX Global with <span className="text-error">❤</span>
        </a>
      </div>
    </footer>
  );
}
