import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/constants";

const BASE = SITE_URL;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api", "/feedback"],
    },
    sitemap: `${BASE}/sitemap.xml`,
  };
}
