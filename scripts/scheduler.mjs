// Always-on scheduler service: wakes up on an interval, syncs whatever dealer
// sources are due, and stays alive between runs.
//
// Deployed as an ordinary Railway service (NOT a Railway cron job). A cron job
// is required to exit when finished, and Railway skips a scheduled execution
// while the previous one is still running — workable for a 15-minute sync, bad
// for a 3-hour one, which would silently swallow several ticks and give no
// graceful shutdown when a deploy lands mid-run. A long-lived process with its
// own timer avoids both.
//
// The schedule that matters is still per-dealer: DealerSource.intervalDays
// decides when a source is due, and this loop only asks "is anything due?".
// So the tick can be frequent and cheap — when nothing is due it is a single
// indexed query.
//
//   Start Command: node scripts/scheduler.mjs
//
// Behaviour:
//   - one run at a time; a tick that arrives while a run is in progress is
//     skipped and logged, never queued up behind it
//   - SIGTERM/SIGINT stop new ticks and let the current run finish, up to
//     SHUTDOWN_GRACE_S, so a deploy does not corrupt a half-written source
//   - on boot, ScrapeRun rows left RUNNING by a killed process are closed out,
//     otherwise the admin panel shows "U tijeku" forever
//
// Env: everything in SYNC_ENV, plus
//   TICK_MINUTES        how often to look for due sources (default 10)
//   RUN_ON_START        "0" to wait for the first tick instead of running now
//   STALE_RUN_MINUTES   age at which an abandoned RUNNING row is failed (default 240)
//   SHUTDOWN_GRACE_S    how long to let a run finish on SIGTERM (default 900)
//   PORT                if set, serves GET /health with the scheduler's status
import { createServer } from "node:http";
import { createSyncer } from "./lib/sync.mjs";
import { createClients, requireEnv, syncConfig, SYNC_ENV } from "./lib/clients.mjs";

process.loadEnvFile(".env");
requireEnv(SYNC_ENV);

const TICK_MS = Number(process.env.TICK_MINUTES || 10) * 60_000;
const RUN_ON_START = process.env.RUN_ON_START !== "0";
const STALE_RUN_MINUTES = Number(process.env.STALE_RUN_MINUTES || 240);
const SHUTDOWN_GRACE_MS = Number(process.env.SHUTDOWN_GRACE_S || 900) * 1000;

const ts = () => new Date().toISOString().replace("T", " ").slice(0, 19);
const log = (msg) => console.log(`[${ts()}] ${msg}`);

const { prisma, s3 } = createClients();
const syncer = createSyncer({ prisma, s3, ...syncConfig(), log });

const state = {
  startedAt: new Date(),
  running: false,
  runStartedAt: null,
  lastFinishedAt: null,
  lastSummary: null,
  ticks: 0,
  skipped: 0,
  stopping: false,
};

/** A process killed mid-run (deploy, OOM, restart) leaves its ScrapeRun row at
 *  RUNNING forever, which the admin panel renders as a sync that never ends.
 *  Nothing else will ever close those rows, so do it at boot. */
async function closeAbandonedRuns() {
  const cutoff = new Date(Date.now() - STALE_RUN_MINUTES * 60_000);
  const { count } = await prisma.scrapeRun.updateMany({
    where: { status: "RUNNING", startedAt: { lt: cutoff } },
    data: {
      status: "FAILED",
      finishedAt: new Date(),
      message: "Prekinuto — proces je zaustavljen tijekom obrade.",
    },
  });
  if (count > 0) log(`closed ${count} abandoned run(s) left RUNNING by a previous process`);
}

async function tick(reason) {
  state.ticks++;
  if (state.stopping) return;
  if (state.running) {
    state.skipped++;
    const mins = Math.round((Date.now() - state.runStartedAt) / 60_000);
    log(`tick skipped (${reason}) — a run has been going for ${mins} min`);
    return;
  }

  state.running = true;
  state.runStartedAt = Date.now();
  try {
    const summary = await syncer.runDue();
    state.lastSummary = summary;
    if (summary.ran > 0) {
      const mins = ((Date.now() - state.runStartedAt) / 60_000).toFixed(1);
      log(`run finished in ${mins} min: ${JSON.stringify(summary)}`);
    }
  } catch (err) {
    // One bad run must not take the scheduler down — the next tick retries, and
    // per-source failures already push nextRunAt out on their own.
    state.lastSummary = { error: String(err?.message ?? err).slice(0, 300) };
    console.error(`[${ts()}] run failed: ${state.lastSummary.error}`);
  } finally {
    state.running = false;
    state.runStartedAt = null;
    state.lastFinishedAt = new Date();
  }
}

// --- optional health endpoint ------------------------------------------------

if (process.env.PORT) {
  createServer((req, res) => {
    if (req.url?.startsWith("/health")) {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(
        JSON.stringify({
          status: "ok",
          running: state.running,
          runningForMin: state.runStartedAt
            ? Math.round((Date.now() - state.runStartedAt) / 60_000)
            : null,
          startedAt: state.startedAt,
          lastFinishedAt: state.lastFinishedAt,
          lastSummary: state.lastSummary,
          ticks: state.ticks,
          skippedTicks: state.skipped,
          tickMinutes: TICK_MS / 60_000,
        }),
      );
      return;
    }
    res.writeHead(404).end();
  }).listen(Number(process.env.PORT), () => log(`health endpoint on :${process.env.PORT}`));
}

// --- lifecycle ---------------------------------------------------------------

/** Let the in-flight run finish rather than killing it halfway: a source
 *  interrupted mid-import leaves cars imported and the rest not, and the wasted
 *  Firecrawl credits are real money on a multi-hour run. */
async function shutdown(signal) {
  if (state.stopping) return;
  state.stopping = true;
  clearInterval(timer);
  log(`${signal} received`);

  if (state.running) {
    log(`waiting up to ${SHUTDOWN_GRACE_MS / 60_000} min for the current run to finish…`);
    const deadline = Date.now() + SHUTDOWN_GRACE_MS;
    while (state.running && Date.now() < deadline) await new Promise((r) => setTimeout(r, 2000));
    if (state.running) log("grace period expired — exiting with a run still in progress");
  }

  await prisma.$disconnect().catch(() => {});
  log("stopped");
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
// Never die silently: log and keep serving, the next tick will retry.
process.on("unhandledRejection", (err) => {
  console.error(`[${ts()}] unhandled rejection: ${String(err?.message ?? err).slice(0, 300)}`);
});

log(
  `scheduler up — tick every ${TICK_MS / 60_000} min, ` +
    `firecrawl ${syncConfig().rpm} req/min, concurrency ${syncConfig().concurrency}`,
);

await closeAbandonedRuns();
const timer = setInterval(() => tick("interval"), TICK_MS);
if (RUN_ON_START) await tick("startup");
