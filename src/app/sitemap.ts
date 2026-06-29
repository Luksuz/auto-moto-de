import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

const BASE = "https://kupiauto.de";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPaths = [
    "",
    "/vozila",
    "/o-nama",
    "/postupak-kupnje",
    "/uvjeti-financiranja",
    "/impressum",
    "/reklamacije",
    "/termin-za-preuzimanje",
    "/tijek-preuzimanja",
  ].map((p) => ({
    url: `${BASE}${p}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: p === "" ? 1 : 0.7,
  }));

  let cars: { slug: string; updatedAt: Date }[] = [];
  try {
    cars = await prisma.car.findMany({
      where: { published: true },
      select: { slug: true, updatedAt: true },
    });
  } catch {
    // DB unavailable at build/runtime — return static paths only.
  }

  const carPaths = cars.map((c) => ({
    url: `${BASE}/vozila/${c.slug}`,
    lastModified: c.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [...staticPaths, ...carPaths];
}
