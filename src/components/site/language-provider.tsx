"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LOCALE_COOKIE, type Locale } from "@/lib/i18n/config";
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
  const [locale, setLocaleState] = React.useState<Locale>(initialLocale);

  const setLocale = React.useCallback(
    (next: Locale) => {
      document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
      setLocaleState(next);
      // Re-render server components with the new cookie (URL + filters kept).
      router.refresh();
    },
    [router],
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
