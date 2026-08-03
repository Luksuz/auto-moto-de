// Shared construction of the clients and config every entry point needs, so the
// CLI and the scheduler service cannot drift on defaults or on which
// environment variables are required.
import { S3Client } from "@aws-sdk/client-s3";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

/** Load .env when running from a checkout, and do nothing when there isn't one.
 *
 *  process.loadEnvFile() THROWS ENOENT on a missing file, so calling it
 *  unguarded crashes on any host that injects the environment itself — Railway,
 *  Docker, CI — before a single line of the job runs. */
export function loadEnv(path = ".env") {
  try {
    process.loadEnvFile(path);
  } catch (err) {
    if (err?.code !== "ENOENT") throw err;
  }
}

export function requireEnv(names) {
  const missing = names.filter((n) => !process.env[n]);
  if (missing.length > 0) {
    console.error(`missing from the environment: ${missing.join(", ")}`);
    process.exit(1);
  }
}

export const SYNC_ENV = [
  "DATABASE_URL",
  "FIRECRAWL_API_KEY",
  "OPENROUTER_API_KEY",
  "MINIO_ENDPOINT",
  "MINIO_ACCESS_KEY_ID",
  "MINIO_SECRET_ACCESS_KEY",
];

export function createClients() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  const s3 = new S3Client({
    region: process.env.MINIO_REGION || "us-east-1",
    endpoint: process.env.MINIO_ENDPOINT,
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.MINIO_ACCESS_KEY_ID,
      secretAccessKey: process.env.MINIO_SECRET_ACCESS_KEY,
    },
  });
  return { prisma, s3 };
}

export function syncConfig(overrides = {}) {
  // Drop empty overrides before merging. An absent CLI flag arrives here as
  // null (the flag helper's own default parameter turns an explicit `undefined`
  // back into `null`), and merging that over a default sends OpenRouter a
  // request with no model, which it rejects with `400 No models provided`.
  // Booleans and 0 must survive, so only null/undefined are dropped.
  const defined = Object.fromEntries(
    Object.entries(overrides).filter(([, v]) => v !== undefined && v !== null),
  );

  return {
    bucket: process.env.MINIO_BUCKET || "kupiauto",
    endpoint: process.env.MINIO_ENDPOINT,
    model: process.env.OPENROUTER_EXTRACT_MODEL || "google/gemini-3.1-flash-lite",
    // Firecrawl bills per minute and answers everything beyond the plan's limit
    // with a 429. This is the ceiling on the whole pipeline: at 10 req/min a run
    // can cover ~600 pages/hour no matter how much concurrency is configured.
    rpm: Number(process.env.FIRECRAWL_RPM || 10),
    concurrency: Number(process.env.CONCURRENCY || 4),
    firecrawlKey: process.env.FIRECRAWL_API_KEY,
    openrouterKey: process.env.OPENROUTER_API_KEY,
    ...defined,
  };
}
