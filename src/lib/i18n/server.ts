import { cookies } from "next/headers";
import { LOCALE_COOKIE, parseLocale, type Locale } from "./config";
import { DICT, type Dict } from "./dictionary";

/** Current UI locale from the request cookie (defaults to hr). */
export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  return parseLocale(store.get(LOCALE_COOKIE)?.value);
}

/** Locale + translated UI strings for server components. */
export async function getT(): Promise<{ t: Dict; locale: Locale }> {
  const locale = await getLocale();
  return { t: DICT[locale], locale };
}
