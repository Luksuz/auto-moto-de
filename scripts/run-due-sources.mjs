// One-shot dealer sync: scrape every source that is due and exit.
//
// Use this for manual runs and for a cron-style job that must terminate. The
// always-on alternative is scripts/scheduler.mjs, which is what a 3-hour run
// wants — a cron job that outlives its own interval gets its next executions
// skipped, and a deploy mid-run kills it with no graceful shutdown.
//
// Both share scripts/lib/sync.mjs, so behaviour is identical either way.
//
// Usage:
//   node scripts/run-due-sources.mjs                  # everything due
//   node scripts/run-due-sources.mjs --all            # ignore nextRunAt
//   node scripts/run-due-sources.mjs --source <id|url>
//   node scripts/run-due-sources.mjs --dry-run        # scrape, write nothing
import { createSyncer } from "./lib/sync.mjs";
import { createClients, requireEnv, syncConfig, SYNC_ENV } from "./lib/clients.mjs";

process.loadEnvFile(".env");

const args = process.argv.slice(2);
const flag = (name, fallback = null) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
const has = (name) => args.includes(`--${name}`);

requireEnv(SYNC_ENV);

const { prisma, s3 } = createClients();
const syncer = createSyncer({
  prisma,
  s3,
  ...syncConfig({
    model: flag("model", undefined),
    rpm: flag("rpm") ? Number(flag("rpm")) : undefined,
    concurrency: flag("concurrency") ? Number(flag("concurrency")) : undefined,
    dryRun: has("dry-run"),
  }),
});

const summary = await syncer.runDue({ all: has("all"), only: flag("source") });

await prisma.$disconnect();
// A cron job should report failure to its scheduler.
process.exit(summary.failed > 0 ? 1 : 0);
