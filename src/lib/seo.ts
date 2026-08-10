import type { Metadata } from "next";
import {
  DEFAULT_LOCALE,
  LOCALES,
  OG_LOCALE,
  localePath,
  type Locale,
} from "@/lib/i18n/config";

/**
 * Canonical + hreflang set for one page.
 *
 * hreflang keys are language-only ("de", not "de-DE") on purpose: the dealer
 * sells into Germany *and* Austria, and a region-qualified tag would only claim
 * the one country. Paths are relative — Next resolves them against metadataBase.
 *
 * x-default points at the unprefixed URL, which the proxy redirects by
 * Accept-Language. That is exactly what x-default is specified to mean.
 */
export function alternatesFor(
  path: string,
  locale: Locale,
): Metadata["alternates"] {
  const languages: Record<string, string> = {};
  for (const l of LOCALES) languages[l] = localePath(l, path);
  languages["x-default"] = path;

  return { canonical: localePath(locale, path), languages };
}

/** openGraph locale fields for a page: own locale plus the other four. */
export function ogLocale(locale: Locale) {
  return {
    locale: OG_LOCALE[locale],
    alternateLocale: LOCALES.filter((l) => l !== locale).map((l) => OG_LOCALE[l]),
  };
}

/**
 * Standard metadata for a localized page: title, description, canonical,
 * hreflang, and matching OpenGraph/Twitter cards. Pages that need more merge
 * onto the result.
 */
export function pageMetadata(opts: {
  title: string;
  description: string;
  path: string;
  locale: Locale;
  images?: string[];
}): Metadata {
  const { title, description, path, locale, images } = opts;

  return {
    title,
    description,
    alternates: alternatesFor(path, locale),
    openGraph: {
      type: "website",
      title,
      description,
      url: localePath(locale, path),
      ...ogLocale(locale),
      ...(images ? { images } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(images ? { images } : {}),
    },
  };
}

/**
 * Metadata for a page whose *body* copy is still Croatian-only (the info and
 * legal pages: postupak-kupnje, uvjeti-financiranja, tijek-preuzimanja,
 * termin-za-preuzimanje, reklamacije, impressum).
 *
 * Those render identical Croatian text under every locale prefix. Claiming a
 * German or French alternate for them would be a false hreflang signal and
 * would file five duplicates of the same page, so only the Croatian URL is
 * indexable and the other four canonicalize onto it. Swap these pages over to
 * pageMetadata() as soon as their content is translated.
 */
export function croatianOnlyMetadata(opts: {
  title: string;
  description: string;
  path: string;
  locale: Locale;
}): Metadata {
  const { title, description, path, locale } = opts;
  const canonical = localePath(DEFAULT_LOCALE, path);

  if (locale === DEFAULT_LOCALE) {
    return {
      title,
      description,
      alternates: { canonical, languages: { [DEFAULT_LOCALE]: canonical } },
      openGraph: { type: "website", title, description, url: canonical },
    };
  }

  return {
    title,
    description,
    alternates: { canonical },
    robots: { index: false, follow: true },
  };
}
