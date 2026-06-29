import type { MetadataRoute } from "next";

const BASE = "https://kupiauto.de";

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
