import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/constants";

const BASE = SITE_URL;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // The feedback board now lives under a locale prefix (/hr/feedback,
      // /de/feedback, …), so the bare path no longer matches anything.
      disallow: ["/admin", "/api", "/feedback", "/*/feedback"],
    },
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
