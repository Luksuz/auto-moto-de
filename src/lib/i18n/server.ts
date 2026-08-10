import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { isLocale, parseLocale, LOCALE_HEADER, type Locale } from "./config";
import { DICT, type Dict } from "./dictionary";

/**
 * Validate the [lang] route param. The locale now comes from the URL, not a
 * cookie, so an unknown prefix must 404 rather than silently render Croatian —
 * otherwise /xx/vozila would be a duplicate of /hr/vozila for every junk value.
 */
export function requireLocale(lang: string): Locale {
  if (!isLocale(lang)) notFound();
  return lang;
}

/** Translated UI strings for a locale (server components). */
export function getDict(locale: Locale): Dict {
  return DICT[locale];
}

/** Locale + strings from a [lang] route param. */
export async function getT(
  params: Promise<{ lang: string }>,
): Promise<{ t: Dict; locale: Locale }> {
  const { lang } = await params;
  const locale = requireLocale(lang);
  return { t: DICT[locale], locale };
}

/**
 * Locale for components that render without route params — the not-found
 * boundaries. Falls back to the proxy's header, then to the default.
 */
export async function getHeaderLocale(): Promise<Locale> {
  return parseLocale((await headers()).get(LOCALE_HEADER));
}
