import NextAuth from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { authConfig } from "@/auth.config";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALE_HEADER,
  isLocale,
  type Locale,
} from "@/lib/i18n/config";

const { auth } = NextAuth(authConfig);

/**
 * Pick a locale from Accept-Language by quality value, matching on the primary
 * subtag so "de-AT,de;q=0.9" resolves to "de" — Austrian visitors are a core
 * market and must not fall through to the default.
 */
function fromAcceptLanguage(header: string | null): Locale | undefined {
  if (!header) return undefined;

  const ranked = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.find((p) => p.trim().startsWith("q="));
      return {
        tag: tag.trim().toLowerCase(),
        q: q ? Number(q.split("=")[1]) : 1,
      };
    })
    .filter((entry) => entry.tag && !Number.isNaN(entry.q))
    .sort((a, b) => b.q - a.q);

  for (const { tag } of ranked) {
    const primary = tag.split("-")[0];
    if (isLocale(primary)) return primary;
  }
  return undefined;
}

function localize(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Admin is single-language and sits outside the [lang] tree.
  if (pathname.startsWith("/admin")) return NextResponse.next();

  const segments = pathname.split("/");
  if (isLocale(segments[1])) {
    // Already localized — just tell the root layout which language this is.
    const headers = new Headers(request.headers);
    headers.set(LOCALE_HEADER, segments[1]);
    return NextResponse.next({ request: { headers } });
  }

  // An explicit switch beats the browser's preference; the browser beats the default.
  const cookie = request.cookies.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(cookie)
    ? cookie
    : (fromAcceptLanguage(request.headers.get("accept-language")) ??
      DEFAULT_LOCALE);

  const url = request.nextUrl.clone();
  url.pathname = pathname === "/" ? `/${locale}` : `/${locale}${pathname}`;

  // 307, not 308: the destination depends on who is asking, so it must never be
  // cached as permanent. Ranking still consolidates via the canonical tags.
  return NextResponse.redirect(url, 307);
}

/**
 * One proxy, two jobs. NextAuth runs its `authorized` callback first (guarding
 * /admin); anything it lets through falls to locale negotiation.
 */
export default auth((request) => localize(request as NextRequest));

export const config = {
  // Admin is matched so auth still guards it. Excluded: API routes, Next
  // internals, and the SEO files that must stay at the domain root — a
  // redirected /robots.txt is a broken /robots.txt.
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|icon.png|robots.txt|sitemap.xml|llms.txt|brand/).*)",
  ],
};
