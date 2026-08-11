"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { SITE_NAV, DEALER, whatsappLink } from "@/lib/constants";
import { useLanguage } from "@/components/site/language-provider";
import { LanguageSwitcher } from "@/components/site/language-switcher";
import { localePath, stripLocale } from "@/lib/i18n/config";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { WhatsAppIcon } from "@/components/site/icons";

/** Compares against the locale-stripped path, so /de/vozila matches "/vozila". */
function isActive(pathname: string, href: string): boolean {
  const path = stripLocale(pathname);
  if (href === "/") return path === "/";
  return path === href || path.startsWith(`${href}/`);
}

export function SiteHeader() {
  const pathname = usePathname();
  const { t, locale, setLocale } = useLanguage();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 border-b border-border-soft bg-background/95 backdrop-blur">
      <div className="flex items-center justify-between gap-5 px-4 py-3.5 sm:px-8 lg:px-12">
        {/* Menu first, then the logo. On a phone the thumb reaches the left edge
            far more easily than the right, and the nav toggle is the only
            control here that a visitor needs repeatedly. */}
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <button
            type="button"
            className="-ml-1 shrink-0 px-2 py-1 text-foreground lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
          >
            {open ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>

          <Link
            href={localePath(locale, "/")}
            onClick={() => setOpen(false)}
            className="shrink-0"
          >
            <Image
              src="/brand/autocar-logo.png"
              alt="AUTOCAR EU"
              width={1522}
              height={424}
              preload
              className="block h-[44px] w-auto sm:h-[52px]"
            />
          </Link>
        </div>

        {/* Everything else sits right: nav, language, WhatsApp. The logo holds
            the left edge on its own, so the links read as one group with the
            actions rather than floating in the middle. */}
        <div className="flex items-center gap-5 lg:gap-7">
          <nav className="hidden flex-wrap items-center gap-[26px] lg:flex">
            {SITE_NAV.map((item) => (
              <Link
                key={item.href}
                href={localePath(locale, item.href)}
                className={cn(
                  "text-[13.5px] font-semibold uppercase tracking-[1.5px] transition-colors hover:text-primary",
                  isActive(pathname, item.href) ? "text-primary" : "text-muted",
                )}
              >
                {t[item.key]}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <LanguageSwitcher locale={locale} setLocale={setLocale} />

            <Button
              asChild
              variant="whatsapp"
              className="hidden font-bold sm:inline-flex"
            >
              <a
                href={whatsappLink(undefined, DEALER.whatsappDe)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <WhatsAppIcon className="size-4" />
                WhatsApp
              </a>
            </Button>
          </div>
        </div>
      </div>

      {open && (
        <div className="flex flex-col px-5 pb-4 pt-1.5 lg:hidden">
          {SITE_NAV.map((item) => (
            <Link
              key={item.href}
              href={localePath(locale, item.href)}
              onClick={() => setOpen(false)}
              className={cn(
                "border-b border-border-soft/50 py-3.5 text-left text-[15px] font-semibold uppercase tracking-[1.5px] transition-colors hover:text-primary",
                isActive(pathname, item.href) ? "text-primary" : "text-muted",
              )}
            >
              {t[item.key]}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
