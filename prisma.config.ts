import fs from "node:fs";
import path from "node:path";
import { defineConfig, env } from "prisma/config";

// Prisma 7 no longer auto-loads .env when a config file is present.
// Node 20.6+ / 26 exposes process.loadEnvFile(), but it THROWS if the file is
// missing — on Vercel/CI env vars are injected directly with no .env file.
const envPath = path.join(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  try {
    process.loadEnvFile?.(envPath);
  } catch {
    // ignore — env already provided by the platform
  }
}

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
