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
    remotePatterns: [
      { protocol: "https", hostname: minioHost },
      { protocol: "https", hostname: "**.up.railway.app" },
    ],
  },
};

export default nextConfig;
