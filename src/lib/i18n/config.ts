export const LOCALES = ["hr", "de", "pt", "uk"] as const;
export type Locale = (typeof LOCALES)[number];

/** Label for the language switcher. */
export const LOCALE_LABEL: Record<Locale, string> = {
  hr: "HR",
  de: "DE",
  pt: "PT",
  uk: "UA",
};

/** BCP 47 tag for Intl formatting; the app's own codes are the short ones. */
export const LOCALE_TAG: Record<Locale, string> = {
  hr: "hr-HR",
  de: "de-DE",
  pt: "pt-PT",
  uk: "uk-UA",
};

export const DEFAULT_LOCALE: Locale = "hr";
export const LOCALE_COOKIE = "lang";

export function parseLocale(value: string | undefined | null): Locale {
  return LOCALES.includes(value as Locale) ? (value as Locale) : DEFAULT_LOCALE;
}
