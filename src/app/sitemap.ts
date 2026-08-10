import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/constants";
import { DEFAULT_LOCALE, LOCALES, localePath } from "@/lib/i18n/config";

const BASE = SITE_URL;

export const dynamic = "force-dynamic";

const abs = (path: string) => `${BASE}${path}`;

/**
 * Paths that exist in every language. Each is emitted once per locale, with the
 * full alternates set so Google can tie the five URLs together as one cluster.
 */
const TRANSLATED_PATHS = [
  "",
  "/vozila",
  "/financiranje",
  "/prijavi-problem",
  "/osiguranje",
  "/o-nama",
] as const;

/**
 * Info and legal pages whose body copy is still Croatian-only. Only the
 * Croatian URL is listed — the other prefixes carry noindex and canonicalize
 * onto it, so advertising them here would contradict the pages themselves.
 */
const CROATIAN_ONLY_PATHS = [
  "/postupak-kupnje",
  "/uvjeti-financiranja",
  "/impressum",
  "/reklamacije",
  "/termin-za-preuzimanje",
  "/tijek-preuzimanja",
] as const;

/**
 * Static pages have no per-page timestamp. Reporting `new Date()` would claim
 * they changed on every crawl, which Google learns to ignore; the deploy time
 * is the honest answer and is stable between builds.
 */
const DEPLOY_TIME = new Date(
  process.env.VERCEL_GIT_COMMIT_DATE ??
    process.env.BUILD_TIME ??
    "2026-08-10T00:00:00Z",
);

function languagesFor(path: string): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const l of LOCALES) languages[l] = abs(localePath(l, path || "/"));
  languages["x-default"] = abs(path || "/");
  return languages;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const translated = TRANSLATED_PATHS.flatMap((p) =>
    LOCALES.map((locale) => ({
      url: abs(localePath(locale, p || "/")),
      lastModified: DEPLOY_TIME,
      changeFrequency: "weekly" as const,
      priority: p === "" ? 1 : 0.7,
      alternates: { languages: languagesFor(p) },
    })),
  );

  const croatianOnly = CROATIAN_ONLY_PATHS.map((p) => ({
    url: abs(localePath(DEFAULT_LOCALE, p)),
    lastModified: DEPLOY_TIME,
    changeFrequency: "monthly" as const,
    priority: 0.4,
  }));

  let cars: { slug: string; updatedAt: Date; images: { url: string }[] }[] = [];
  try {
    cars = await prisma.car.findMany({
      where: { published: true },
      select: {
        slug: true,
        updatedAt: true,
        images: {
          select: { url: true },
          orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
          // A handful is plenty for image discovery; a full gallery per car per
          // locale would bloat the sitemap for no extra indexing benefit.
          take: 5,
        },
      },
    });
  } catch {
    // DB unavailable at build/runtime — return static paths only.
  }

  const carPaths = cars.flatMap((c) =>
    LOCALES.map((locale) => ({
      url: abs(localePath(locale, `/vozila/${c.slug}`)),
      lastModified: c.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
      alternates: { languages: languagesFor(`/vozila/${c.slug}`) },
      images: c.images.map((i) => i.url),
    })),
  );

  return [...translated, ...croatianOnly, ...carPaths];
}
