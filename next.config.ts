import type { NextConfig } from "next";

const minioHost = (() => {
  try {
    return new URL(process.env.MINIO_ENDPOINT || "https://localhost").hostname;
  } catch {
    return "localhost";
  }
})();

const nextConfig: NextConfig = {
  images: {
    // Vercel's image optimizer is billed per SOURCE image, and one dealer import
    // is ~1000 new photos — enough to exhaust the plan's allowance in a single
    // run. Once exhausted, /_next/image returns 402
    // OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED for EVERY image on the site,
    // including local assets like the logo, so the whole page renders broken.
    //
    // The import pipeline already runs sharp, so it writes 400/800/1600 variants
    // to MinIO itself (see scripts/lib/car-import.mjs VARIANTS) and each surface
    // requests the size it needs. That removes the dependency on Vercel's
    // optimizer entirely instead of just raising the ceiling on it.
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: minioHost },
      { protocol: "https", hostname: "**.up.railway.app" },
    ],
  },
};

export default nextConfig;
