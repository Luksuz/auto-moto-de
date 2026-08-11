"use client";

import * as React from "react";
import { Check, ChevronDown } from "lucide-react";
import {
  LOCALES,
  LOCALE_FLAG,
  LOCALE_LABEL,
  LOCALE_NAME,
  type Locale,
} from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

/** Language switcher as a dropdown.
 *
 *  It used to be a row of five pills, which grew with every language added and
 *  crowded the header on phones. A dropdown costs one click but stays the same
 *  width at any number of locales, and it has room for the full language name —
 *  "Українська" is more use to a Ukrainian visitor than "UA".
 *
 *  Rendered from LOCALES, so adding a language still needs no change here. */
export function LanguageSwitcher({
  locale,
  setLocale,
  className,
}: {
  locale: Locale;
  setLocale: (code: Locale) => void;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const root = React.useRef<HTMLDivElement>(null);

  // A dropdown that only closes on its own button is a trap on touch devices,
  // where there is no Escape key and no obvious way back out.
  React.useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={root} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={LOCALE_NAME[locale]}
        className="flex items-center gap-1.5 rounded-full border border-border-strong px-2.5 py-2 text-[12.5px] font-bold tracking-[1px] text-foreground transition-colors hover:border-primary sm:px-3"
      >
        <span aria-hidden className="text-[15px] leading-none">
          {LOCALE_FLAG[locale]}
        </span>
        {LOCALE_LABEL[locale]}
        <ChevronDown
          className={cn("size-3.5 text-muted transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-1.5 min-w-[180px] overflow-hidden rounded-lg border border-border-strong bg-surface shadow-lg"
        >
          {LOCALES.map((code) => (
            <button
              key={code}
              type="button"
              role="menuitemradio"
              aria-checked={locale === code}
              onClick={() => {
                setLocale(code);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-[13.5px] transition-colors hover:bg-surface-2",
                locale === code ? "font-bold text-primary" : "text-muted",
              )}
            >
              <span aria-hidden className="text-[15px] leading-none">
                {LOCALE_FLAG[code]}
              </span>
              <span className="flex-1">{LOCALE_NAME[code]}</span>
              {locale === code && <Check className="size-4 shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
