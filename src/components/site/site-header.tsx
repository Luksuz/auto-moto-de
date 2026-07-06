"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { SITE_NAV, DEALER, whatsappLink } from "@/lib/constants";
import { useLanguage } from "@/components/site/language-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { WhatsAppIcon } from "@/components/site/icons";

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  const pathname = usePathname();
  const { t, locale, setLocale } = useLanguage();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 border-b border-border-soft bg-background/95 backdrop-blur">
      <div className="flex items-center justify-between gap-5 px-4 py-3.5 sm:px-8 lg:px-12">
        <Link href="/" onClick={() => setOpen(false)} className="shrink-0">
          <Image
            src="/brand/autocar-logo.png"
            alt="AUTOCAR EU"
            width={1522}
            height={424}
            preload
            className="block h-[44px] w-auto sm:h-[52px]"
          />
        </Link>

        <nav className="hidden flex-wrap items-center gap-[26px] lg:flex">
          {SITE_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
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
          <button
            type="button"
            className="px-2 py-1 text-foreground lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
          >
            {open ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>

          <div className="flex overflow-hidden rounded-full border border-border-strong">
            <button
              type="button"
              onClick={() => setLocale("hr")}
              className={cn(
                "px-3.5 py-2 text-[12.5px] font-bold tracking-[1px]",
                locale === "hr"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted",
              )}
            >
              HR
            </button>
            <button
              type="button"
              onClick={() => setLocale("de")}
              className={cn(
                "px-3.5 py-2 text-[12.5px] font-bold tracking-[1px]",
                locale === "de"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted",
              )}
            >
              DE
            </button>
          </div>

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

      {open && (
        <div className="flex flex-col px-5 pb-4 pt-1.5 lg:hidden">
          {SITE_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
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
