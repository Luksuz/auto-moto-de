export const LOCALES = ["hr", "de", "en", "fr", "uk"] as const;
export type Locale = (typeof LOCALES)[number];

/** Label for the language switcher. */
export const LOCALE_LABEL: Record<Locale, string> = {
  hr: "HR",
  de: "DE",
  en: "EN",
  fr: "FR",
  uk: "UA",
};

/** BCP 47 tag for Intl formatting; the app's own codes are the short ones. */
export const LOCALE_TAG: Record<Locale, string> = {
  hr: "hr-HR",
  de: "de-DE",
  en: "en-GB",
  fr: "fr-FR",
  uk: "uk-UA",
};

export const DEFAULT_LOCALE: Locale = "hr";
export const LOCALE_COOKIE = "lang";

/**
 * Request header the proxy sets so the root layout can render <html lang>.
 * A root layout can't read the [lang] route param, and admin/API routes have
 * no locale segment at all.
 */
export const LOCALE_HEADER = "x-locale";

/** OG locale tag (underscored BCP 47) for openGraph.locale / alternateLocale. */
export const OG_LOCALE: Record<Locale, string> = {
  hr: "hr_HR",
  de: "de_DE",
  en: "en_GB",
  fr: "fr_FR",
  uk: "uk_UA",
};

/** Strict check — used where an unknown locale must 404 rather than fall back. */
export function isLocale(value: string | undefined | null): value is Locale {
  return LOCALES.includes(value as Locale);
}

/** Lenient parse with fallback — used for cookie/header negotiation. */
export function parseLocale(value: string | undefined | null): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

/**
 * Prefix an app-relative path with a locale: ("de", "/vozila") -> "/de/vozila".
 * Every locale is prefixed, including the default, so one URL never serves two
 * languages — that ambiguity is what kept four of five locales out of the index.
 */
export function localePath(locale: Locale, path: string): string {
  if (!path.startsWith("/")) return path; // external / mailto / tel — leave alone
  return path === "/" ? `/${locale}` : `/${locale}${path}`;
}

/** Inverse of localePath: "/de/vozila" -> "/vozila". Unprefixed paths pass through. */
export function stripLocale(pathname: string): string {
  const [, maybe, ...rest] = pathname.split("/");
  if (!isLocale(maybe)) return pathname;
  return rest.length ? `/${rest.join("/")}` : "/";
}
