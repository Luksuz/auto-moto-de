"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  LOCALE_COOKIE,
  localePath,
  stripLocale,
  type Locale,
} from "@/lib/i18n/config";
import { DICT, type Dict } from "@/lib/i18n/dictionary";

interface LanguageContextValue {
  locale: Locale;
  t: Dict;
  setLocale: (locale: Locale) => void;
}

const LanguageContext = React.createContext<LanguageContextValue | null>(null);

export function LanguageProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // The URL is the source of truth now, so the prop tracks it on every navigation.
  const locale = initialLocale;

  const setLocale = React.useCallback(
    (next: Locale) => {
      // Still recorded, but only so a later visit to an unprefixed URL lands on
      // the language you picked — the proxy reads it. Rendering follows the URL.
      document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;

      const query = searchParams.toString();
      const target = localePath(next, stripLocale(pathname));
      router.push(query ? `${target}?${query}` : target);
    },
    [router, pathname, searchParams],
  );

  const value = React.useMemo(
    () => ({ locale, t: DICT[locale], setLocale }),
    [locale, setLocale],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = React.useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}

export function useT(): Dict {
  return useLanguage().t;
}

export function useLocale(): Locale {
  return useLanguage().locale;
}
